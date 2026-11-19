import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { WishlistService } from "../../../src/services/wishlist.service";
import { UsersService } from "../../../src/services/users.service";
import { WishItem } from "../../../src/models/wish-item.model";
import {
  createMockRepository,
  MockRepository,
} from "../../helpers/mock-repository";

describe("WishlistService", () => {
  let service: WishlistService;
  let repo: MockRepository;
  const usersService = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    repo = createMockRepository();
    const module = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: getRepositoryToken(WishItem), useValue: repo },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();
    service = module.get(WishlistService);
  });

  describe("create", () => {
    it("attaches the current user as owner", async () => {
      const result = await service.create("u1", {
        title: "Camera",
        price: 100,
      });
      expect(repo.create).toHaveBeenCalledWith({
        title: "Camera",
        price: 100,
        userId: "u1",
      });
      expect(result).toMatchObject({ title: "Camera", userId: "u1" });
    });
  });

  describe("findAll", () => {
    it("returns only the user's wishes, newest first", async () => {
      repo.find.mockResolvedValue([{ id: "2" }, { id: "1" }]);
      await expect(service.findAll("u1")).resolves.toHaveLength(2);
      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: "u1" },
        order: { id: "DESC" },
      });
    });
  });

  describe("remove", () => {
    it("removes a wish owned by the user", async () => {
      const wish = { id: "1", userId: "u1" };
      repo.findOne.mockResolvedValue(wish);
      await service.remove("u1", "1");
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "1", userId: "u1" },
      });
      expect(repo.remove).toHaveBeenCalledWith(wish);
    });

    it("throws NotFound when the wish is missing or belongs to someone else", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove("u1", "1")).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("merges the dto into the existing wish and saves", async () => {
      repo.findOne.mockResolvedValue({ id: "1", title: "Old", price: 5 });
      const result = await service.update("u1", "1", { title: "New" });
      expect(result).toMatchObject({ id: "1", title: "New", price: 5 });
      expect(repo.save).toHaveBeenCalled();
    });

    it("throws NotFound when the wish is not the users", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update("u1", "1", { title: "x" })).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe("findPartnerWishlist", () => {
    it("returns the partner's wishes", async () => {
      usersService.findOne.mockResolvedValue({ id: "u1", partnerId: "p1" });
      repo.find.mockResolvedValue([{ id: "9" }]);
      await expect(service.findPartnerWishlist("u1")).resolves.toEqual([
        { id: "9" },
      ]);
      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: "p1" },
        order: { id: "DESC" },
      });
    });

    it("throws NotFound when the user does not exist", async () => {
      usersService.findOne.mockResolvedValue(null);
      await expect(service.findPartnerWishlist("u1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws BadRequest when no partner is connected", async () => {
      usersService.findOne.mockResolvedValue({ id: "u1", partnerId: null });
      await expect(service.findPartnerWishlist("u1")).rejects.toThrow(
        "You have no connected partner",
      );
      expect(repo.find).not.toHaveBeenCalled();
    });
  });

  describe("reserveWish", () => {
    it("reserves a partner's wish", async () => {
      repo.findOne.mockResolvedValue({ id: "1", userId: "partner" });
      const result = await service.reserveWish("me", "1");
      expect(result).toMatchObject({ reservedById: "me" });
    });

    it("throws NotFound for an unknown wish", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.reserveWish("me", "1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("forbids reserving your own wish", async () => {
      repo.findOne.mockResolvedValue({ id: "1", userId: "me" });
      await expect(service.reserveWish("me", "1")).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe("unreserveWish", () => {
    it("clears the reservation made by the requester", async () => {
      repo.findOne.mockResolvedValue({ id: "1", reservedById: "me" });
      const result = await service.unreserveWish("me", "1");
      expect(result).toMatchObject({ reservedById: null });
    });

    it("throws NotFound for an unknown wish", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.unreserveWish("me", "1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("rejects cancelling a reservation made by someone else", async () => {
      repo.findOne.mockResolvedValue({ id: "1", reservedById: "other" });
      await expect(service.unreserveWish("me", "1")).rejects.toThrow(
        "You have not reserved this wish",
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("rejects when the wish is not reserved at all", async () => {
      repo.findOne.mockResolvedValue({ id: "1", reservedById: null });
      await expect(service.unreserveWish("me", "1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
