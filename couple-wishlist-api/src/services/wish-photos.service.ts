import {
  BadRequestException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  BeforeApplicationShutdown,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { DataSource, EntityManager, LessThanOrEqual } from "typeorm";
import { WishResponseDto } from "../dto/wishlist/wish-response.dto";
import { WishItem } from "../models/wish-item.model";
import { WishPhotoCleanup } from "../models/wish-photo-cleanup.model";
import { MAX_WISH_PHOTO_BYTES } from "../wish-photo-upload";
import { WishPhotoStorage } from "./wish-photo-storage.service";

const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_IMAGE_PIXELS = 25_000_000;
const STAGED_CLEANUP_DELAY = 15 * 60_000;
const CLEANUP_INTERVAL = 30_000;
const FAILED_CLEANUP_DELAY = 60_000;

@Injectable()
export class WishPhotosService
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private readonly logger = new Logger(WishPhotosService.name);
  private timer?: NodeJS.Timeout;
  private cleanup?: Promise<void>;

  constructor(
    private readonly database: DataSource,
    private readonly storage: WishPhotoStorage,
  ) {}

  onApplicationBootstrap() {
    if (!this.storage.enabled) return;
    this.timer = setInterval(() => {
      this.cleanup ??= this.cleanUp()
        .catch(() => this.logger.warn("Wish photo cleanup could not run"))
        .finally(() => {
          this.cleanup = undefined;
        });
    }, CLEANUP_INTERVAL).unref();
  }

  async beforeApplicationShutdown() {
    clearInterval(this.timer);
    await this.cleanup;
  }

  async response(wish: WishItem, viewerId: string) {
    let url: string | null = null;
    if (wish.photoKey) {
      try {
        url = await this.storage.url(wish.photoKey);
      } catch {
        this.logger.warn("Wish photo URL could not be signed");
      }
    }
    return new WishResponseDto(wish, viewerId, url);
  }

  async upload(
    photo: Buffer | undefined,
    attach: (manager: EntityManager, key: string) => Promise<void>,
  ) {
    if (!photo?.length) {
      throw new BadRequestException("Upload a valid JPEG, PNG, or WebP photo");
    }
    if (photo.length > MAX_WISH_PHOTO_BYTES)
      throw new PayloadTooLargeException();
    const contentType = await this.validate(photo);
    if (!this.storage.enabled) {
      throw new ServiceUnavailableException(
        "Wish photo storage is unavailable",
      );
    }
    const key = `wish-photos/${randomUUID()}`;
    const queue = this.database.getRepository(WishPhotoCleanup);

    // The committed staging row survives a crash or uncertain S3 PUT result.
    await queue.insert({
      key,
      retryAt: new Date(Date.now() + STAGED_CLEANUP_DELAY),
    });

    let uploaded = false;
    try {
      await this.database.transaction(async (manager) => {
        await manager.findOneOrFail(WishPhotoCleanup, {
          where: { key },
          lock: { mode: "pessimistic_write" },
        });
        try {
          await this.storage.put(key, photo, contentType);
          uploaded = true;
        } catch {
          throw new ServiceUnavailableException(
            "Wish photo could not be uploaded",
          );
        }
        await attach(manager, key);
        await manager.delete(WishPhotoCleanup, { key });
      });
    } catch (error) {
      if (uploaded) {
        // Acknowledged uploads can be cleaned right away. If the attachment
        // committed despite a connection error, the staging row is gone.
        await queue.update({ key }, { retryAt: new Date() }).catch(() => {
          this.logger.warn("Wish photo cleanup could not be expedited");
        });
      }
      throw error;
    }
  }

  async cleanUp() {
    for (let count = 0; count < 20; count++) {
      const found = await this.database.transaction(async (manager) => {
        const entry = await manager.findOne(WishPhotoCleanup, {
          where: { retryAt: LessThanOrEqual(new Date()) },
          order: { retryAt: "ASC" },
          lock: { mode: "pessimistic_write", onLocked: "skip_locked" },
        });
        if (!entry) return false;
        try {
          await this.storage.delete(entry.key);
        } catch {
          await manager.update(WishPhotoCleanup, entry.key, {
            retryAt: new Date(Date.now() + FAILED_CLEANUP_DELAY),
          });
          this.logger.warn("Wish photo deletion will be retried");
          return true;
        }
        await manager.delete(WishPhotoCleanup, entry.key);
        return true;
      });
      if (!found) return;
    }
  }

  private async validate(photo: Buffer): Promise<string> {
    const invalid = () =>
      new BadRequestException("Upload a valid JPEG, PNG, or WebP photo");

    const format = this.imageFormat(photo);
    if (!format) throw invalid();
    try {
      const image = sharp(photo, {
        animated: true,
        failOn: "warning",
        limitInputPixels: MAX_IMAGE_PIXELS,
      });
      // stats decodes pixel data, including all frames of an animated WebP.
      await image.stats();
    } catch {
      throw invalid();
    }
    return `image/${format}`;
  }

  private imageFormat(photo: Buffer) {
    if (photo.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) {
      return "jpeg";
    }
    if (photo.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
      return "png";
    }
    if (
      photo.toString("ascii", 0, 4) === "RIFF" &&
      photo.toString("ascii", 8, 12) === "WEBP"
    ) {
      return "webp";
    }
    return null;
  }
}
