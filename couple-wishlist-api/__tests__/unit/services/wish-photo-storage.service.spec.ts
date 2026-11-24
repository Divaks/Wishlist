import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { WishPhotoStorage } from "../../../src/services/wish-photo-storage.service";

jest.mock("@aws-sdk/s3-request-presigner");

describe("WishPhotoStorage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses private S3 objects and signs GET for five minutes", async () => {
    const send = jest
      .spyOn(S3Client.prototype, "send")
      .mockReturnValue(undefined);
    const destroy = jest.spyOn(S3Client.prototype, "destroy");
    jest
      .mocked(getSignedUrl)
      .mockResolvedValue("https://photos.example/signed");
    const storage = new WishPhotoStorage(
      new ConfigService({
        WISH_PHOTO_BUCKET: "private-photos",
        WISH_PHOTO_REGION: "eu-central-1",
      }),
    );
    const body = Buffer.from("image");
    expect(storage.enabled).toBe(true);
    await storage.put("object", body, "image/jpeg");
    const put = send.mock.calls[0][0] as PutObjectCommand;
    expect(put).toBeInstanceOf(PutObjectCommand);
    expect(put.input).toEqual({
      Bucket: "private-photos",
      Key: "object",
      Body: body,
      ContentType: "image/jpeg",
      CacheControl: "private, no-store",
    });
    await expect(storage.url("object")).resolves.toBe(
      "https://photos.example/signed",
    );
    const [client, command, options] = jest.mocked(getSignedUrl).mock.calls[0];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect((command as GetObjectCommand).input).toEqual({
      Bucket: "private-photos",
      Key: "object",
    });
    expect(options).toEqual({ expiresIn: 300 });
    await expect((client as S3Client).config.region()).resolves.toBe(
      "eu-central-1",
    );
    await storage.delete("object");
    const deletion = send.mock.calls[1][0] as DeleteObjectCommand;
    expect(deletion).toBeInstanceOf(DeleteObjectCommand);
    expect(deletion.input).toEqual({ Bucket: "private-photos", Key: "object" });
    storage.onApplicationShutdown();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("allows legacy deployments without a configured bucket or region", async () => {
    for (const config of [{}, { WISH_PHOTO_BUCKET: "private" }]) {
      const storage = new WishPhotoStorage(new ConfigService(config));
      expect(storage.enabled).toBe(false);
      await expect(
        storage.put("object", Buffer.alloc(1), "image/png"),
      ).rejects.toMatchObject({ status: 503 });
      storage.onApplicationShutdown();
    }
  });
});
