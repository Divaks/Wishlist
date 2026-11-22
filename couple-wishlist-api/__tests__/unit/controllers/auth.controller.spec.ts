import { Test } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { AuthController } from "../../../src/controllers/auth.controller";
import { AuthService } from "../../../src/services/auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  const authService = { login: jest.fn(), register: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    controller = module.get(AuthController);
  });

  it("login passes email and password to the service", async () => {
    authService.login.mockResolvedValue({ accessToken: "t" });
    await expect(
      controller.login({ email: "a@b.com", password: "pw" }),
    ).resolves.toEqual({ accessToken: "t" });
    expect(authService.login).toHaveBeenCalledWith("a@b.com", "pw");
  });

  it("login propagates Unauthorized errors", async () => {
    authService.login.mockRejectedValue(new UnauthorizedException());
    await expect(
      controller.login({ email: "a@b.com", password: "bad" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("register forwards the dto to the service", async () => {
    const dto = { email: "a@b.com", password: "secret1", name: "Ann" };
    authService.register.mockResolvedValue({ id: "u1" });
    await expect(controller.create(dto)).resolves.toEqual({ id: "u1" });
    expect(authService.register).toHaveBeenCalledWith(dto);
  });
});
