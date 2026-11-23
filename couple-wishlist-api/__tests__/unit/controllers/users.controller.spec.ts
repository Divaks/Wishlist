import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { UsersController } from "../../../src/controllers/users.controller";
import { UsersService } from "../../../src/services/users.service";
import { UpdateUserDto } from "../../../src/dto/users/update-user.dto";

describe("UsersController", () => {
  let controller: UsersController;
  const usersService = {
    updateProfile: jest.fn(),
    deleteAccount: jest.fn(),
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
    const user = { userId: "u1", email: "a@b.com" };
    expect(controller.getProfile(user)).toBe(user);
  });

  it("updateProfile delegates to the service", async () => {
    const dto: UpdateUserDto = { name: "New Name", birthday: "1990-01-01" };
    usersService.updateProfile.mockResolvedValue({ id: "u1", ...dto });
    await expect(controller.updateProfile("u1", dto)).resolves.toEqual({
      id: "u1",
      ...dto,
    });
    expect(usersService.updateProfile).toHaveBeenCalledWith("u1", dto);
  });

  it("deleteAccount delegates to the service", async () => {
    await controller.deleteAccount("u1");
    expect(usersService.deleteAccount).toHaveBeenCalledWith("u1");
  });

  it("deleteAccount propagates NotFound", async () => {
    usersService.deleteAccount.mockRejectedValue(new NotFoundException());
    await expect(controller.deleteAccount("u1")).rejects.toThrow(
      NotFoundException,
    );
  });
});
