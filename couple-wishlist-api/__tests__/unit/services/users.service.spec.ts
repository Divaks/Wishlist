import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { UsersService } from "../../../src/services/users.service";
import { User } from "../../../src/models/user.model";
import { UpdateUserDto } from "../../../src/dto/users/update-user.dto";
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

    it("lowercases email", async () => {
      await service.create({
        email: "A@B.COM",
        password: "hashed",
        name: "Ann",
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "a@b.com" }),
      );
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
        select: ["id", "email", "password"],
      });
    });

    it("lowercases email in query", async () => {
      repo.findOne.mockResolvedValue({ id: "1" });
      await service.findOneByEmailWithPassword("A@B.COM");
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: "a@b.com" } }),
      );
    });
  });

  describe("updateProfile", () => {
    it("updates name and birthday", async () => {
      const user = { id: "u1", name: "Old", birthday: null };
      repo.findOne.mockResolvedValue(user);
      repo.save.mockResolvedValue({
        ...user,
        name: "New",
        birthday: "1990-01-01",
      });

      const dto: UpdateUserDto = { name: "New", birthday: "1990-01-01" };
      const result = await service.updateProfile("u1", dto);

      expect(result.name).toBe("New");
      expect(result.birthday).toEqual("1990-01-01");
      expect(repo.save).toHaveBeenCalled();
    });

    it("throws NotFound when user does not exist", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.updateProfile("u1", { name: "New" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("updates only provided fields", async () => {
      const user = { id: "u1", name: "Old", birthday: "1990-01-01" };
      repo.findOne.mockResolvedValue(user);
      repo.save.mockResolvedValue({ ...user, name: "New" });

      const result = await service.updateProfile("u1", { name: "New" });

      expect(result.name).toBe("New");
      expect(result.birthday).toEqual("1990-01-01");
    });
  });

  describe("deleteAccount", () => {
    it("requires ownership transfer before deletion", async () => {
      repo.transactionManager.findOne.mockResolvedValue({ id: "u1" });
      repo.transactionManager.existsBy.mockResolvedValue(true);
      await expect(service.deleteAccount("u1")).rejects.toThrow(
        ConflictException,
      );
      expect(repo.transactionManager.remove).not.toHaveBeenCalled();
    });
    it("removes the user", async () => {
      const user = { id: "u1" };
      repo.transactionManager.findOne.mockResolvedValue(user);
      await service.deleteAccount("u1");
      expect(repo.transactionManager.remove).toHaveBeenCalledWith(user);
    });

    it("throws NotFound when user does not exist", async () => {
      repo.transactionManager.findOne.mockResolvedValue(null);
      await expect(service.deleteAccount("u1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
