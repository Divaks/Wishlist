import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { UsersController } from "../../../src/controllers/users.controller";
import { UsersService } from "../../../src/services/users.service";

describe("UsersController", () => {
  let controller: UsersController;
  const usersService = {
    generateInviteCode: jest.fn(),
    connectPartner: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();
    controller = module.get(UsersController);
  });

  it("getProfile returns the authenticated user", () => {
    const user = { userId: "u1", email: "a@b.com", partnerId: null };
    expect(controller.getProfile(user)).toBe(user);
  });

  it("generateCode delegates to the service", async () => {
    usersService.generateInviteCode.mockResolvedValue({ inviteCode: "ABC" });
    await expect(controller.generateCode("u1")).resolves.toEqual({
      inviteCode: "ABC",
    });
    expect(usersService.generateInviteCode).toHaveBeenCalledWith("u1");
  });

  it("connect delegates user id and code", async () => {
    usersService.connectPartner.mockResolvedValue({ inviteCode: "ABC" });
    await controller.connect("u1", "ABC");
    expect(usersService.connectPartner).toHaveBeenCalledWith("u1", "ABC");
  });

  it("connect propagates service errors", async () => {
    usersService.connectPartner.mockRejectedValue(new NotFoundException());
    await expect(controller.connect("u1", "BAD")).rejects.toThrow(
      NotFoundException,
    );
  });
});
