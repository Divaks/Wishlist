import { ParseUUIDPipe, type ArgumentMetadata } from "@nestjs/common";
export class WishIdPipe extends ParseUUIDPipe {
  transform(value: string, metadata: ArgumentMetadata) {
    if (/^[1-9]\d{0,9}$/.test(value) && Number(value) <= 2147483647)
      value =
        "00000000-0000-4000-8000-" +
        Number(value).toString(16).padStart(12, "0");
    return super.transform(value, metadata);
  }
}
