import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  Injectable,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class WishPhotoStorage implements OnApplicationShutdown {
  private readonly client: S3Client | undefined;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>("WISH_PHOTO_BUCKET") ?? "";
    const region = config.get<string>("WISH_PHOTO_REGION");
    if (this.bucket && region) {
      this.client = new S3Client({ region });
    }
  }

  get enabled() {
    return Boolean(this.client);
  }

  onApplicationShutdown() {
    this.client?.destroy();
  }

  private requireClient() {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "Wish photo storage is unavailable",
      );
    }
    return this.client;
  }

  async put(key: string, photo: Buffer, contentType: string) {
    await this.requireClient().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: photo,
        ContentType: contentType,
        CacheControl: "private, no-store",
      }),
      { abortSignal: AbortSignal.timeout(15_000) },
    );
  }

  async delete(key: string) {
    await this.requireClient().send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      { abortSignal: AbortSignal.timeout(15_000) },
    );
  }

  url(key: string) {
    return getSignedUrl(
      this.requireClient(),
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 300 },
    );
  }
}
