import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
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

      await expect(service.findMyGroups("u1")).resolves.toEqual([{ id: "g1" }]);
      expect(qb.innerJoin).toHaveBeenCalledWith(
        "group.members",
        "member",
        "member.userId = :userId",
        { userId: "u1" },
      );
      expect(qb.orderBy).toHaveBeenCalledWith("group.createdAt", "DESC");
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
      expect(groups.update).toHaveBeenCalledWith("g1", { name: "New" });
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
  });

  describe("remove", () => {
    it("lets the owner delete the group", async () => {
      asOwner();
      await service.remove("u1", "g1");
      expect(groups.delete).toHaveBeenCalledWith("g1");
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
    it("adds an existing user as MEMBER", async () => {
      members.findOne
        .mockResolvedValueOnce({ role: GroupRole.MEMBER }) // requester check
        .mockResolvedValueOnce(null); // not yet in group
      users.findOne.mockResolvedValue({ id: "u2" });

      await service.inviteMember("u1", "g1", "b@c.com");

      expect(users.findOne).toHaveBeenCalledWith({
        where: { email: "b@c.com" },
      });
      expect(members.create).toHaveBeenCalledWith({
        groupId: "g1",
        userId: "u2",
        role: GroupRole.MEMBER,
      });
      expect(members.save).toHaveBeenCalled();
    });

    it("forbids non-members from inviting", async () => {
      asOutsider();
      await expect(service.inviteMember("u1", "g1", "b@c.com")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("throws NotFound when the email is not registered", async () => {
      asMember();
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

  describe("removeMember", () => {
    it("lets the owner remove another member", async () => {
      members.findOne
        .mockResolvedValueOnce({ role: GroupRole.OWNER })
        .mockResolvedValueOnce({ id: "m2" });
      await service.removeMember("owner", "g1", "u2");
      expect(members.delete).toHaveBeenCalledWith("m2");
    });

    it("lets a member leave on their own", async () => {
      members.findOne
        .mockResolvedValueOnce({ role: GroupRole.MEMBER })
        .mockResolvedValueOnce({ id: "m2" });
      await service.removeMember("u2", "g1", "u2");
      expect(members.delete).toHaveBeenCalledWith("m2");
    });

    it("forbids a requester who is not in the group", async () => {
      asOutsider();
      await expect(service.removeMember("u9", "g1", "u2")).rejects.toThrow(
        "You are not a member of this group",
      );
    });

    it("forbids a regular member from removing someone else", async () => {
      asMember();
      await expect(service.removeMember("u1", "g1", "u2")).rejects.toThrow(
        "Only the owner can remove other members",
      );
      expect(members.delete).not.toHaveBeenCalled();
    });

    it("forbids the owner from leaving their own group", async () => {
      asOwner();
      await expect(
        service.removeMember("owner", "g1", "owner"),
      ).rejects.toThrow("The owner cannot leave the group");
      expect(members.delete).not.toHaveBeenCalled();
    });

    it("throws NotFound when the target is not a member", async () => {
      members.findOne
        .mockResolvedValueOnce({ role: GroupRole.OWNER })
        .mockResolvedValueOnce(null);
      await expect(service.removeMember("owner", "g1", "u2")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getGroupWishes", () => {
    it("returns wishes of all members, hiding other people's reservations", async () => {
      members.findOne.mockResolvedValue({ role: GroupRole.MEMBER });
      members.find.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
      const qb = createMockQueryBuilder([{ id: "w1" }]);
      wishes.createQueryBuilder.mockReturnValue(qb);

      await expect(service.getGroupWishes("u1", "g1")).resolves.toEqual([
        { id: "w1" },
      ]);
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
    });

    it("returns an empty list for a group without members", async () => {
      asMember();
      members.find.mockResolvedValue([]);
      await expect(service.getGroupWishes("u1", "g1")).resolves.toEqual([]);
      expect(wishes.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("forbids non-members", async () => {
      asOutsider();
      await expect(service.getGroupWishes("u1", "g1")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
