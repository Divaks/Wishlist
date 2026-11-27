import { PayloadTooLargeException } from "@nestjs/common";
import type { Request } from "express";
import type { Writable } from "node:stream";

export const MAX_WISH_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_WISH_PHOTO_BYTES + 64 * 1024;

export const wishPhotoUploadOptions = {
  limits: { fileSize: MAX_WISH_PHOTO_BYTES, files: 1, fields: 0, parts: 1 },
  // Multer 2.5 passes the request and its multipart parser to this hook.
  streamHandler(request: Request, parser: Writable) {
    let received = 0;
    function countBytes(chunk: Buffer) {
      received += chunk.length;
      if (received > MAX_MULTIPART_BYTES) {
        request.off("data", countBytes);
        request.unpipe(parser);
        parser.destroy(new PayloadTooLargeException());
      }
    }
    request.once("close", () => request.off("data", countBytes));
    request.on("data", countBytes);
    request.pipe(parser);
  },
};
