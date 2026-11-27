import { Logger } from "@nestjs/common";
import sharp from "sharp";
import { DataSource, EntityManager } from "typeorm";
import { WishItem } from "../../../src/models/wish-item.model";
import { WishPhotoCleanup } from "../../../src/models/wish-photo-cleanup.model";
import { WishPhotoStorage } from "../../../src/services/wish-photo-storage.service";
import { WishPhotosService } from "../../../src/services/wish-photos.service";
import { MAX_WISH_PHOTO_BYTES } from "../../../src/wish-photo-upload";

describe("WishPhotosService", () => {
  const queue = { insert: jest.fn(), update: jest.fn() };
  const manager = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };
  const database = {
    getRepository: jest.fn(() => queue),
    transaction: jest.fn((run: (tx: EntityManager) => unknown) =>
      run(manager as unknown as EntityManager),
    ),
  };
  const storage = {
    enabled: true,
    put: jest.fn(),
    url: jest.fn(),
    delete: jest.fn(),
  };
  let service: WishPhotosService;
  let images: Buffer[];

  beforeAll(async () => {
    const pixel = sharp({
      create: { width: 1, height: 1, channels: 3, background: "#ffffff" },
    });
    images = await Promise.all([
      pixel.clone().jpeg().toBuffer(),
      pixel.clone().png().toBuffer(),
      pixel.clone().webp().toBuffer(),
    ]);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    storage.enabled = true;
    queue.update.mockResolvedValue({});
    service = new WishPhotosService(
      database as unknown as DataSource,
      storage as unknown as WishPhotoStorage,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("signs attached photos and keeps wish reads available during a signing failure", async () => {
    const wish = { photoKey: "secret-key" } as WishItem;
    storage.url.mockResolvedValueOnce("https://photos.example/signed");
    expect(await service.response(wish, "owner")).toMatchObject({
      photoUrl: "https://photos.example/signed",
    });
    expect(storage.url).toHaveBeenCalledWith("secret-key");
    storage.url.mockRejectedValueOnce(new Error("unavailable"));
    expect(await service.response(wish, "owner")).toMatchObject({
      photoUrl: null,
    });
    expect(
      await service.response({ ...wish, photoKey: null }, "owner"),
    ).toMatchObject({ photoUrl: null });
    expect(storage.url).toHaveBeenCalledTimes(2);
  });

  it("stages each upload before putting its bytes and removes the staging row after attachment", async () => {
    const attach = jest.fn();
    const keys = new Set<string>();
    for (const [index, mime] of ["jpeg", "png", "webp"].entries()) {
      const image = images[index];
      await service.upload(image, attach);
      const key = (queue.insert.mock.lastCall?.[0] as WishPhotoCleanup).key;
      keys.add(key);
      expect(key).toMatch(/^wish-photos\//);
      expect(manager.findOneOrFail).toHaveBeenLastCalledWith(WishPhotoCleanup, {
        where: { key },
        lock: { mode: "pessimistic_write" },
      });
      expect(storage.put).toHaveBeenLastCalledWith(key, image, `image/${mime}`);
      expect(attach).toHaveBeenLastCalledWith(manager, key);
      expect(manager.delete).toHaveBeenLastCalledWith(WishPhotoCleanup, {
        key,
      });
      expect(queue.insert.mock.invocationCallOrder.at(-1)).toBeLessThan(
        storage.put.mock.invocationCallOrder.at(-1)!,
      );
    }
    expect(keys.size).toBe(3);
  });

  it("validates photo size and content before staging", async () => {
    const attach = jest.fn();
    await expect(service.upload(undefined, attach)).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      service.upload(Buffer.alloc(MAX_WISH_PHOTO_BYTES + 1), attach),
    ).rejects.toMatchObject({ status: 413 });
    for (const data of [
      Buffer.from("text"),
      images[1].subarray(0, 32),
      Buffer.from("RIFFxxxxINVALID"),
    ]) {
      await expect(service.upload(data, attach)).rejects.toMatchObject({
        status: 400,
      });
    }
    storage.enabled = false;
    await expect(service.upload(images[0], attach)).rejects.toMatchObject({
      status: 503,
    });
    expect(queue.insert).not.toHaveBeenCalled();
  });

  it("retains staging on S3 failure and schedules an acknowledged orphan for cleanup", async () => {
    const attach = jest.fn();
    storage.put.mockRejectedValueOnce(new Error("unavailable"));
    await expect(service.upload(images[0], attach)).rejects.toMatchObject({
      status: 503,
    });
    expect(attach).not.toHaveBeenCalled();
    expect(queue.update).not.toHaveBeenCalled();
    expect(manager.delete).not.toHaveBeenCalled();

    const failure = new Error("attachment failed");
    attach.mockRejectedValue(failure);
    queue.update.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(service.upload(images[0], attach)).rejects.toBe(failure);
    const key = (queue.insert.mock.lastCall?.[0] as WishPhotoCleanup).key;
    expect(queue.update).toHaveBeenCalledWith(
      { key },
      { retryAt: expect.any(Date) },
    );
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it("reschedules failed deletions and removes completed entries", async () => {
    manager.findOne
      .mockResolvedValueOnce({ key: "retry" })
      .mockResolvedValueOnce({ key: "finished" })
      .mockResolvedValueOnce(null);
    storage.delete.mockRejectedValueOnce(new Error("unavailable"));
    await service.cleanUp();
    expect(manager.update).toHaveBeenCalledWith(WishPhotoCleanup, "retry", {
      retryAt: expect.any(Date),
    });
    expect(manager.delete).toHaveBeenCalledTimes(1);
    expect(manager.delete).toHaveBeenCalledWith(WishPhotoCleanup, "finished");
  });

  it("polls for cleanup only when configured and awaits an active run on shutdown", async () => {
    jest.useFakeTimers();
    storage.enabled = false;
    const cleanup = jest.spyOn(service, "cleanUp");
    service.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(30_000);
    expect(cleanup).not.toHaveBeenCalled();

    storage.enabled = true;
    cleanup.mockRejectedValueOnce(new Error("database unavailable"));
    service.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(30_000);
    expect(cleanup).toHaveBeenCalledTimes(1);

    let finish!: () => void;
    cleanup.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    await jest.advanceTimersByTimeAsync(60_000);
    expect(cleanup).toHaveBeenCalledTimes(2);
    const done = service.beforeApplicationShutdown();
    finish();
    await done;
    await jest.advanceTimersByTimeAsync(30_000);
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});
