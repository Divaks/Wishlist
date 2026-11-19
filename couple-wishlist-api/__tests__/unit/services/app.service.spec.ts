import { AppService } from "../../../src/services/app.service";

describe("AppService", () => {
  it("returns the greeting", () => {
    expect(new AppService().getHello()).toBe("Hello World!");
  });
});
