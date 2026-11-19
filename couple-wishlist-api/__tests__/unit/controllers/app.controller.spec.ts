import { Test } from "@nestjs/testing";
import { AppController } from "../../../src/controllers/app.controller";
import { AppService } from "../../../src/services/app.service";

describe("AppController", () => {
  it('GET / returns "Hello World!"', async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
    expect(module.get(AppController).getHello()).toBe("Hello World!");
  });
});
