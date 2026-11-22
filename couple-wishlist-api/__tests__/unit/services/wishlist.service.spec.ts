import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { WishlistService } from "../../../src/services/wishlist.service";
import { WishItem, Priority } from "../../../src/models/wish-item.model";
import { GroupMember } from "../../../src/models/group-member.model";
import {
  PaginationDto,
  PaginatedResult,
} from "../../../src/dto/common/pagination.dto";
import { WishResponseDto } from "../../../src/dto/wishlist/wish-response.dto";
import {
  createMockRepository,
  MockRepository,
} from "../../helpers/mock-repository";

describe("WishlistService", () => {
  let service: WishlistService;
  let repo: MockRepository;
  let members: MockRepository;

  beforeEach(async () => {
    jest.resetAllMocks();
    repo = createMockRepository();
    members = createMockRepository();
    const module = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: getRepositoryToken(WishItem), useValue: repo },
        { provide: getRepositoryToken(GroupMember), useValue: members },
      ],
    }).compile();
    service = module.get(WishlistService);
  });

  const pagination: PaginationDto = { page: 1, limit: 20 };

  describe("create", () => {
    it("attaches the current user as owner with defaults", async () => {
      const result = await service.create("u1", {
        title: "Camera",
        price: 100,
      });
      expect(repo.create).toHaveBeenCalledWith({
        title: "Camera",
        price: 100,
        description: undefined,
        link: undefined,
        priority: "medium",
        userId: "u1",
      });
      expect(result).toMatchObject({ title: "Camera", userId: "u1" });
    });

    it("uses default price 0 when not provided", async () => {
      const result = await service.create("u1", { title: "Free Item" });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ price: 0 }),
      );
    });

    it("uses default priority MEDIUM when not provided", async () => {
      const result = await service.create("u1", { title: "Item" });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: Priority.MEDIUM }),
      );
    });
  });

  describe("findAll", () => {
    it("returns only the user's wishes, newest first with pagination", async () => {
      const wishes = [
        { id: "2", userId: "u1", title: "Wish 2" },
        { id: "1", userId: "u1", title: "Wish 1" },
      ];
      repo.findAndCount.mockResolvedValue([wishes, 2]);

      const result = await service.findAll("u1", pagination);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { userId: "u1" },
        order: { id: "DESC" },
        skip: 0,
        take: 20,
        relations: ["user", "reservedBy"],
      });
      expect(result).toBeInstanceOf(PaginatedResult);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.data[0]).toBeInstanceOf(WishResponseDto);
    });

    it("uses default page and limit when not provided", async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll("u1", {});
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  describe("findOne", () => {
    it("returns a single wish with response DTO", async () => {
      const wish = {
        id: "1",
        userId: "u1",
        title: "Test Wish",
        description: null,
        price: 0,
        link: null,
        priority: "medium",
        isInCart: false,
        occasion: null,
        occasionDate: null,
        user: null,
        reservedById: null,
        reservedBy: null,
      };
      repo.findOne.mockResolvedValue(wish);

      const result = await service.findOne("u1", "1");

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "1", userId: "u1" },
        relations: ["user", "reservedBy"],
      });
      expect(result).toBeInstanceOf(WishResponseDto);
      expect(result.title).toBe("Test Wish");
    });

    it("throws NotFound when wish not found", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne("u1", "1")).rejects.toThrow(
        NotFoundException,
      );
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
      const wish = { id: "1", userId: "u1", title: "Old", price: 5 };
      repo.findOne.mockResolvedValue(wish);
      repo.save.mockResolvedValue({ ...wish, title: "New" });

      const result = await service.update("u1", "1", { title: "New" });

      expect(result).toBeInstanceOf(WishResponseDto);
      expect(result.title).toBe("New");
      expect(repo.save).toHaveBeenCalled();
    });

    it("throws NotFound when the wish is not the users", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update("u1", "1", { title: "x" })).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("updates only provided fields", async () => {
      const wish = {
        id: "1",
        userId: "u1",
        title: "Old",
        price: 5,
        description: "desc",
      };
      repo.findOne.mockResolvedValue(wish);
      repo.save.mockResolvedValue({ ...wish, price: 10 });

      await service.update("u1", "1", { title: "Old", price: 10 });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 10,
          title: "Old",
          description: "desc",
        }),
      );
    });
  });

  describe("reserveWish", () => {
    it("reserves a wish from another user in same group", async () => {
      const wish = { id: "1", userId: "partner", reservedById: null };
      repo.findOne.mockResolvedValue(wish);
      members.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: "gm1" }),
      });
      repo.save.mockResolvedValue({ ...wish, reservedById: "me" });

      const result = await service.reserveWish("me", "1");

      expect(result).toBeInstanceOf(WishResponseDto);
      expect(result.reservedById).toBe("me");
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

    it("throws BadRequest when wish already reserved", async () => {
      repo.findOne.mockResolvedValue({
        id: "1",
        userId: "partner",
        reservedById: "other",
      });
      await expect(service.reserveWish("me", "1")).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("throws Forbidden when users share no group", async () => {
      repo.findOne.mockResolvedValue({
        id: "1",
        userId: "partner",
        reservedById: null,
      });
      members.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });
      await expect(service.reserveWish("me", "1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("returns early when userId1 === userId2 in assertSharedGroup", async () => {
      const wish = { id: "1", userId: "me", reservedById: null };
      repo.findOne.mockResolvedValue(wish);
      await expect(service.reserveWish("me", "1")).rejects.toThrow(
        BadRequestException,
      );
      // Should not call assertSharedGroup query when same user
      expect(members.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe("unreserveWish", () => {
    it("clears the reservation made by the requester", async () => {
      const wish = { id: "1", reservedById: "me" };
      repo.findOne.mockResolvedValue(wish);
      repo.save.mockResolvedValue({ ...wish, reservedById: null });

      const result = await service.unreserveWish("me", "1");

      expect(result).toBeInstanceOf(WishResponseDto);
      expect(result.reservedById).toBeNull();
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
