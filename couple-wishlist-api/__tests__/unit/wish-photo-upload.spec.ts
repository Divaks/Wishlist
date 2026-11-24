import { PassThrough, Writable } from "node:stream";
import { once } from "node:events";
import type { Request } from "express";
import {
  MAX_WISH_PHOTO_BYTES,
  wishPhotoUploadOptions,
} from "../../src/wish-photo-upload";

describe("wish photo multipart request limit", () => {
  function streams() {
    const request = new PassThrough();
    const write = jest.fn(
      (_chunk: Buffer, _encoding: BufferEncoding, done: () => void) => done(),
    );
    const parser = new Writable({ write });
    wishPhotoUploadOptions.streamHandler(request as unknown as Request, parser);
    return { request, parser, write };
  }

  it("forwards a photo within the request budget", async () => {
    const { request, parser, write } = streams();
    const finished = once(parser, "finish");
    request.end(Buffer.alloc(MAX_WISH_PHOTO_BYTES));
    await finished;
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("rejects a chunked request whose total body exceeds the budget", async () => {
    const { request, parser, write } = streams();
    const failed = new Promise<Error>((resolve) =>
      parser.once("error", resolve),
    );
    request.write(Buffer.alloc(MAX_WISH_PHOTO_BYTES));
    request.end(Buffer.alloc(64 * 1024 + 1));
    await expect(failed).resolves.toMatchObject({ status: 413 });
    expect(write).toHaveBeenCalledTimes(1);
  });
});
