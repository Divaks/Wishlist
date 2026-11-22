import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { WishlistController } from "../../../src/controllers/wishlist.controller";
import { WishlistService } from "../../../src/services/wishlist.service";
import { PaginationDto } from "../../../src/dto/common/pagination.dto";

describe("WishlistController", () => {
  let controller: WishlistController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    reserveWish: jest.fn(),
    unreserveWish: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [{ provide: WishlistService, useValue: service }],
    }).compile();
    controller = module.get(WishlistController);
  });

  const pagination: PaginationDto = { page: 1, limit: 20 };

  it("create", async () => {
    service.create.mockResolvedValue({ id: "1" });
    await expect(controller.create("u1", { title: "T" })).resolves.toEqual({
      id: "1",
    });
    expect(service.create).toHaveBeenCalledWith("u1", { title: "T" });
  });

  it("findAll", async () => {
    service.findAll.mockResolvedValue([]);
    await controller.findAll("u1", pagination);
    expect(service.findAll).toHaveBeenCalledWith("u1", pagination);
  });

  it("findOne", async () => {
    service.findOne.mockResolvedValue({ id: "1", title: "Test" });
    await controller.findOne("u1", "w1");
    expect(service.findOne).toHaveBeenCalledWith("u1", "w1");
  });

  it("remove", async () => {
    await controller.remove("u1", "w1");
    expect(service.remove).toHaveBeenCalledWith("u1", "w1");
  });

  it("remove propagates NotFound", async () => {
    service.remove.mockRejectedValue(new NotFoundException());
    await expect(controller.remove("u1", "w1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("update", async () => {
    await controller.update("u1", "w1", { title: "New" });
    expect(service.update).toHaveBeenCalledWith("u1", "w1", { title: "New" });
  });

  it("reserveWish", async () => {
    await controller.reserveWish("u1", "w1");
    expect(service.reserveWish).toHaveBeenCalledWith("u1", "w1");
  });

  it("unreserveWish", async () => {
    await controller.unreserveWish("u1", "w1");
    expect(service.unreserveWish).toHaveBeenCalledWith("u1", "w1");
  });
});
