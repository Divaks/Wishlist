import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { UsersService } from "../../../src/services/users.service";
import { User } from "../../../src/models/user.model";
import {
  createMockRepository,
  MockRepository,
} from "../../helpers/mock-repository";

describe("UsersService", () => {
  let service: UsersService;
  let repo: MockRepository;

  beforeEach(async () => {
    repo = createMockRepository();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  describe("create", () => {
    it("persists email, password and name", async () => {
      const result = await service.create({
        email: "a@b.com",
        password: "hashed",
        name: "Ann",
      });
      expect(repo.create).toHaveBeenCalledWith({
        email: "a@b.com",
        password: "hashed",
        name: "Ann",
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ email: "a@b.com", name: "Ann" });
    });
  });

  describe("create (errors)", () => {
    it("throws Conflict on a unique-violation (duplicate email)", async () => {
      repo.save.mockRejectedValue(
        new QueryFailedError("INSERT", [], { code: "23505" } as any),
      );
      await expect(
        service.create({ email: "a@b.com", password: "h" }),
      ).rejects.toThrow(ConflictException);
    });

    it("rethrows other database errors untouched", async () => {
      const boom = new QueryFailedError("INSERT", [], { code: "08006" } as any);
      repo.save.mockRejectedValue(boom);
      await expect(
        service.create({ email: "a@b.com", password: "h" }),
      ).rejects.toBe(boom);
    });

    it("rethrows non-database errors untouched", async () => {
      repo.save.mockRejectedValue(new Error("network"));
      await expect(
        service.create({ email: "a@b.com", password: "h" }),
      ).rejects.toThrow("network");
    });
  });

  describe("findAll / findOne", () => {
    it("findAll returns every user", async () => {
      repo.find.mockResolvedValue([{ id: "1" }, { id: "2" }]);
      await expect(service.findAll()).resolves.toHaveLength(2);
    });

    it("findOne looks up by id", async () => {
      repo.findOne.mockResolvedValue({ id: "1" });
      await expect(service.findOne("1")).resolves.toEqual({ id: "1" });
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
    });

    it("findOne returns null for an unknown id", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne("nope")).resolves.toBeNull();
    });
  });

  describe("findOneByEmailWithPassword", () => {
    it("explicitly selects the password column", async () => {
      repo.findOne.mockResolvedValue({ id: "1", password: "h" });
      await service.findOneByEmailWithPassword("a@b.com");
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: "a@b.com" },
        select: ["id", "email", "password", "partnerId"],
      });
    });
  });

  describe("generateInviteCode", () => {
    it("stores and returns an 8-char upper-case code", async () => {
      const { inviteCode } = await service.generateInviteCode("u1");
      expect(inviteCode).toMatch(/^[A-Z0-9]{1,8}$/);
      expect(repo.update).toHaveBeenCalledWith("u1", { inviteCode });
    });

    it("is derived from Math.random", async () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      const { inviteCode } = await service.generateInviteCode("u1");
      expect(inviteCode).toBe((0.5).toString(36).substr(2, 8).toUpperCase());
      jest.restoreAllMocks();
    });
  });

  describe("connectPartner", () => {
    it("links both users to each other", async () => {
      repo.findOne.mockResolvedValue({ id: "partner" });
      const result = await service.connectPartner("me", "CODE");
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { inviteCode: "CODE" },
      });
      expect(repo.update).toHaveBeenCalledWith("me", { partnerId: "partner" });
      expect(repo.update).toHaveBeenCalledWith("partner", { partnerId: "me" });
      expect(result).toEqual({ inviteCode: "CODE" });
    });

    it("throws NotFound for an invalid code", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.connectPartner("me", "BAD")).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("throws BadRequest when using your own code", async () => {
      repo.findOne.mockResolvedValue({ id: "me" });
      await expect(service.connectPartner("me", "MINE")).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
