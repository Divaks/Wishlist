import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { GroupsService } from "../../../src/services/groups.service";
import { Group } from "../../../src/models/group.model";
import { GroupMember, GroupRole } from "../../../src/models/group-member.model";
import { User } from "../../../src/models/user.model";
import { WishItem } from "../../../src/models/wish-item.model";
import {
  PaginationDto,
  PaginatedResult,
} from "../../../src/dto/common/pagination.dto";
import { WishResponseDto } from "../../../src/dto/wishlist/wish-response.dto";
import {
  createMockQueryBuilder,
  createMockRepository,
  MockRepository,
} from "../../helpers/mock-repository";

describe("GroupsService", () => {
  let service: GroupsService;
  let groups: MockRepository;
  let members: MockRepository;
  let users: MockRepository;
  let wishes: MockRepository;

  const asOwner = () =>
    members.findOne.mockResolvedValue({ role: GroupRole.OWNER });
  const asMember = () =>
    members.findOne.mockResolvedValue({ role: GroupRole.MEMBER });
  const asOutsider = () => members.findOne.mockResolvedValue(null);

  beforeEach(async () => {
    groups = createMockRepository();
    members = createMockRepository();
    users = createMockRepository();
    wishes = createMockRepository();
    groups.transactionManager.getRepository.mockImplementation(
      (entity: unknown) => (entity === Group ? groups : members),
    );
    const module = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: getRepositoryToken(Group), useValue: groups },
        { provide: getRepositoryToken(GroupMember), useValue: members },
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(WishItem), useValue: wishes },
      ],
    }).compile();
    service = module.get(GroupsService);
  });

  const pagination: PaginationDto = { page: 1, limit: 20 };

  describe("create", () => {
    it("creates the group and enrols the creator as OWNER", async () => {
      groups.save.mockResolvedValue({ id: "g1", name: "Trip" });
      asOwner();
      groups.findOne.mockResolvedValue({ id: "g1", name: "Trip" });

      const result = await service.create("u1", { name: "Trip" });

      expect(groups.create).toHaveBeenCalledWith({
        name: "Trip",
        createdById: "u1",
      });
      expect(members.create).toHaveBeenCalledWith({
        groupId: "g1",
        userId: "u1",
        role: GroupRole.OWNER,
      });
      expect(members.save).toHaveBeenCalled();
      expect(result).toEqual({ id: "g1", name: "Trip" });
    });
  });

  describe("findMyGroups", () => {
    it("queries groups the user belongs to, newest first", async () => {
      const qb = createMockQueryBuilder([{ id: "g1" }]);
      groups.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findMyGroups("u1", pagination)).resolves.toEqual(
        new PaginatedResult([{ id: "g1" }], 1, 1, 20),
      );
      expect(qb.innerJoin).toHaveBeenCalledWith(
        "group.members",
        "member",
        "member.userId = :userId",
        { userId: "u1" },
      );
      expect(qb.orderBy).toHaveBeenCalledWith("group.createdAt", "DESC");
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });
  });

  describe("findOne", () => {
    it("returns the group with relations for a member", async () => {
      asMember();
      groups.findOne.mockResolvedValue({ id: "g1" });
      await expect(service.findOne("u1", "g1")).resolves.toEqual({
        id: "g1",
      });
      expect(groups.findOne).toHaveBeenCalledWith({
        where: { id: "g1" },
        relations: ["members", "members.user", "createdBy"],
      });
    });

    it("forbids non-members", async () => {
      asOutsider();
      await expect(service.findOne("u1", "g1")).rejects.toThrow(
        ForbiddenException,
      );
      expect(groups.findOne).not.toHaveBeenCalled();
    });

    it("throws NotFound when the group does not exist", async () => {
      asMember();
      groups.findOne.mockResolvedValue(null);
      await expect(service.findOne("u1", "g1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("lets the owner update and returns the refreshed group", async () => {
      asOwner();
      groups.findOne.mockResolvedValue({ id: "g1", name: "New" });
      const result = await service.update("u1", "g1", { name: "New" });
      expect(groups.update).toHaveBeenCalledWith(
        { id: "g1", createdById: "u1" },
        { name: "New" },
      );
      expect(result).toEqual({ id: "g1", name: "New" });
    });

    it("forbids a regular member", async () => {
      asMember();
      await expect(service.update("u1", "g1", { name: "x" })).rejects.toThrow(
        ForbiddenException,
      );
      expect(groups.update).not.toHaveBeenCalled();
    });

    it("forbids an outsider", async () => {
      asOutsider();
      await expect(service.update("u1", "g1", { name: "x" })).rejects.toThrow(
        "Only the group owner can perform this action",
      );
    });

    it("throws NotFound when group does not exist", async () => {
      asOwner();
      groups.findOne.mockResolvedValue(null);
      await expect(service.update("u1", "g1", { name: "x" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("only updates provided fields (name only)", async () => {
      asOwner();
      const existingGroup = { id: "g1", name: "Old", description: "desc" };
      groups.findOne.mockResolvedValue(existingGroup);
      groups.save.mockResolvedValue({ ...existingGroup, name: "New" });

      await service.update("u1", "g1", { name: "New" });

      expect(groups.update).toHaveBeenCalledWith(
        { id: "g1", createdById: "u1" },
        { name: "New" },
      );
    });

    it("only updates provided fields (description only)", async () => {
      asOwner();
      const existingGroup = { id: "g1", name: "Old", description: "old desc" };
      groups.findOne.mockResolvedValue(existingGroup);
      groups.save.mockResolvedValue({
        ...existingGroup,
        description: "New desc",
      });

      await service.update("u1", "g1", { description: "New desc" });

      expect(groups.update).toHaveBeenCalledWith(
        { id: "g1", createdById: "u1" },
        { description: "New desc" },
      );
    });

    it("uses default page and limit when not provided", async () => {
      asOwner();
      groups.findOne.mockResolvedValue({ id: "g1", name: "Test" });
      const qb = createMockQueryBuilder([{ id: "g1" }]);
      groups.createQueryBuilder.mockReturnValue(qb);

      await service.findMyGroups("u1", {});

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });
  });

  describe("remove", () => {
    it("lets the owner delete the group", async () => {
      asOwner();
      await service.remove("u1", "g1");
      expect(groups.delete).toHaveBeenCalledWith({
        id: "g1",
        createdById: "u1",
      });
    });

    it("forbids a regular member", async () => {
      asMember();
      await expect(service.remove("u1", "g1")).rejects.toThrow(
        ForbiddenException,
      );
      expect(groups.delete).not.toHaveBeenCalled();
    });
  });

  describe("inviteMember", () => {
    it("creates a pending invitation for an existing user", async () => {
      groups.query.mockResolvedValue([{ groupId: "g1" }]);
      members.findOne
        .mockResolvedValueOnce({ role: GroupRole.OWNER }) // requester check
        .mockResolvedValueOnce(null); // not yet in group
      users.findOne.mockResolvedValue({ id: "u2" });

      await service.inviteMember("u1", "g1", "b@c.com");

      expect(users.findOne).toHaveBeenCalledWith({
        where: { email: "b@c.com" },
      });
      expect(groups.query).toHaveBeenCalledWith(
        expect.stringContaining("group_invitation"),
        ["g1", "u2", "u1"],
      );
      expect(members.save).not.toHaveBeenCalled();
    });

    it("forbids non-members from inviting", async () => {
      asOutsider();
      await expect(service.inviteMember("u1", "g1", "b@c.com")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("throws NotFound when the email is not registered", async () => {
      asOwner();
      users.findOne.mockResolvedValue(null);
      await expect(
        service.inviteMember("u1", "g1", "ghost@c.com"),
      ).rejects.toThrow("No user with email ghost@c.com");
    });

    it("throws Conflict when the user is already in the group", async () => {
      members.findOne
        .mockResolvedValueOnce({ role: GroupRole.OWNER })
        .mockResolvedValueOnce({ id: "existing" });
      users.findOne.mockResolvedValue({ id: "u2" });
      await expect(service.inviteMember("u1", "g1", "b@c.com")).rejects.toThrow(
        ConflictException,
      );
      expect(members.save).not.toHaveBeenCalled();
    });
  });

  describe("group administration", () => {
    beforeEach(() =>
      groups.transactionManager.findOne.mockResolvedValue({
        createdById: "owner",
      }),
    );
    it("allows members to leave", async () => {
      await service.removeMember("me", "g1", "me");
      expect(groups.transactionManager.delete).toHaveBeenCalledWith(
        GroupMember,
        { groupId: "g1", userId: "me" },
      );
    });
    it("protects the owner and other members", async () => {
      await expect(service.removeMember("me", "g1", "other")).rejects.toThrow(
        ForbiddenException,
      );
      await expect(
        service.removeMember("owner", "g1", "owner"),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.transferOwnership("me", "g1", "other"),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.transferOwnership("owner", "g1", "owner"),
      ).rejects.toThrow(BadRequestException);
    });
    it("fails if group or target disappears", async () => {
      groups.transactionManager.findOne.mockResolvedValueOnce(null);
      await expect(service.removeMember("me", "g1", "me")).rejects.toThrow(
        NotFoundException,
      );
      groups.transactionManager.delete.mockResolvedValueOnce({ affected: 0 });
      await expect(
        service.removeMember("owner", "g1", "other"),
      ).rejects.toThrow(NotFoundException);
      groups.transactionManager.update
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 0 });
      await expect(
        service.transferOwnership("owner", "g1", "other"),
      ).rejects.toThrow(NotFoundException);
    });
    it("transfers ownership inside the transaction", async () => {
      await service.transferOwnership("owner", "g1", "other");
      expect(groups.transactionManager.update).toHaveBeenCalledWith(
        Group,
        "g1",
        { createdById: "other" },
      );
    });
    it("only consumes invitations addressed to the current user", async () => {
      groups.transactionManager.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "m" }]);
      await expect(service.acceptInvitation("other", "g1")).rejects.toThrow(
        NotFoundException,
      );
      await service.acceptInvitation("me", "g1");
      expect(groups.transactionManager.query).toHaveBeenLastCalledWith(
        expect.any(String),
        ["g1", "me"],
      );
      groups.query.mockResolvedValue([{ groupId: "g1" }]);
      expect(await service.invitations("me")).toEqual([{ groupId: "g1" }]);
    });
  });
  describe("getGroupWishes", () => {
    it("returns wishes of all members, hiding other people's reservations", async () => {
      members.findOne.mockResolvedValue({ role: GroupRole.MEMBER });
      members.find.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
      const qb = createMockQueryBuilder([{ id: "w1" }]);
      wishes.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getGroupWishes("u1", "g1", pagination);

      expect(result).toBeInstanceOf(PaginatedResult);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.data[0]).toBeInstanceOf(WishResponseDto);
      expect(members.find).toHaveBeenCalledWith({
        where: { groupId: "g1" },
        select: ["userId"],
      });
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        "wish.reservedBy",
        "reservedBy",
        "reservedBy.id != :userId",
        { userId: "u1" },
      );
      expect(qb.where).toHaveBeenCalledWith("wish.userId IN (:...memberIds)", {
        memberIds: ["u1", "u2"],
      });
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it("returns an empty list for a group without members", async () => {
      asMember();
      members.find.mockResolvedValue([]);
      await expect(
        service.getGroupWishes("u1", "g1", pagination),
      ).resolves.toEqual(new PaginatedResult([], 0, 1, 20));
      expect(wishes.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("forbids non-members", async () => {
      asOutsider();
      await expect(
        service.getGroupWishes("u1", "g1", pagination),
      ).rejects.toThrow(ForbiddenException);
    });

    it("uses default page and limit when not provided", async () => {
      asMember();
      members.find.mockResolvedValue([{ userId: "u1" }]);
      const qb = createMockQueryBuilder([{ id: "w1" }]);
      wishes.createQueryBuilder.mockReturnValue(qb);

      await service.getGroupWishes("u1", "g1", {});

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });
  });

  describe("getMemberWishes", () => {
    it("returns wishes of a specific member", async () => {
      asMember();
      members.findOne.mockResolvedValue({ groupId: "g1", userId: "u2" });
      wishes.findAndCount.mockResolvedValue([[{ id: "w1" }], 1]);

      const result = await service.getMemberWishes(
        "u1",
        "g1",
        "u2",
        pagination,
      );

      expect(result).toBeInstanceOf(PaginatedResult);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.data[0]).toBeInstanceOf(WishResponseDto);
      expect(wishes.findAndCount).toHaveBeenCalledWith({
        where: { userId: "u2" },
        order: { createdAt: "DESC", id: "DESC" },
        relations: ["user", "reservedBy"],
        skip: 0,
        take: 20,
      });
    });

    it("throws ForbiddenException when requester is not a member", async () => {
      asOutsider();
      await expect(
        service.getMemberWishes("u9", "g1", "u2", pagination),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException when target member is not in group", async () => {
      asMember();
      members.findOne
        .mockResolvedValueOnce({ role: GroupRole.MEMBER }) // requester check passes
        .mockResolvedValueOnce(null); // target member not found
      await expect(
        service.getMemberWishes("u1", "g1", "u9", pagination),
      ).rejects.toThrow(NotFoundException);
    });

    it("uses default page and limit when not provided", async () => {
      asMember();
      members.findOne.mockResolvedValue({ groupId: "g1", userId: "u2" });
      wishes.findAndCount.mockResolvedValue([[], 0]);

      await service.getMemberWishes("u1", "g1", "u2", {});

      expect(wishes.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });
});
