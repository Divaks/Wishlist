import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Group } from "../models/group.model";
import { GroupMember, GroupRole } from "../models/group-member.model";
import { User } from "../models/user.model";
import { WishItem } from "../models/wish-item.model";
import { CreateGroupDto } from "../dto/groups/create-group.dto";
import { UpdateGroupDto } from "../dto/groups/update-group.dto";

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly memberRepository: Repository<GroupMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WishItem)
    private readonly wishRepository: Repository<WishItem>,
  ) {}

  async create(userId: string, dto: CreateGroupDto): Promise<Group> {
    const group = this.groupRepository.create({
      ...dto,
      createdById: userId,
    });
    const saved = await this.groupRepository.save(group);

    const member = this.memberRepository.create({
      groupId: saved.id,
      userId,
      role: GroupRole.OWNER,
    });
    await this.memberRepository.save(member);

    return this.findOne(userId, saved.id);
  }

  async findMyGroups(userId: string): Promise<Group[]> {
    return this.groupRepository
      .createQueryBuilder("group")
      .innerJoin("group.members", "member", "member.userId = :userId", {
        userId,
      })
      .leftJoinAndSelect("group.members", "allMembers")
      .leftJoinAndSelect("allMembers.user", "memberUser")
      .leftJoinAndSelect("group.createdBy", "creator")
      .orderBy("group.createdAt", "DESC")
      .getMany();
  }

  async findOne(userId: string, groupId: string): Promise<Group> {
    await this.assertMember(userId, groupId);

    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ["members", "members.user", "createdBy"],
    });

    if (!group) throw new NotFoundException("Group not found");
    return group;
  }

  async update(
    userId: string,
    groupId: string,
    dto: UpdateGroupDto,
  ): Promise<Group> {
    await this.assertOwner(userId, groupId);
    await this.groupRepository.update(groupId, dto);
    return this.findOne(userId, groupId);
  }

  async remove(userId: string, groupId: string): Promise<void> {
    await this.assertOwner(userId, groupId);
    await this.groupRepository.delete(groupId);
  }

  async inviteMember(
    requesterId: string,
    groupId: string,
    email: string,
  ): Promise<GroupMember> {
    await this.assertMember(requesterId, groupId);

    const target = await this.userRepository.findOne({ where: { email } });
    if (!target) throw new NotFoundException(`No user with email ${email}`);

    const existing = await this.memberRepository.findOne({
      where: { groupId, userId: target.id },
    });
    if (existing) throw new ConflictException("User is already in this group");

    const member = this.memberRepository.create({
      groupId,
      userId: target.id,
      role: GroupRole.MEMBER,
    });
    return this.memberRepository.save(member);
  }

  async removeMember(
    requesterId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<void> {
    const requesterMembership = await this.memberRepository.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!requesterMembership)
      throw new ForbiddenException("You are not a member of this group");

    const isOwner = requesterMembership.role === GroupRole.OWNER;
    const isSelf = requesterId === targetUserId;

    if (!isOwner && !isSelf) {
      throw new ForbiddenException("Only the owner can remove other members");
    }

    if (isOwner && isSelf) {
      throw new ForbiddenException(
        "The owner cannot leave the group. Delete the group instead.",
      );
    }

    const target = await this.memberRepository.findOne({
      where: { groupId, userId: targetUserId },
    });
    if (!target) throw new NotFoundException("Member not found in this group");

    await this.memberRepository.delete(target.id);
  }

  async getGroupWishes(userId: string, groupId: string): Promise<WishItem[]> {
    await this.assertMember(userId, groupId);

    const members = await this.memberRepository.find({
      where: { groupId },
      select: ["userId"],
    });
    const memberIds = members.map((m) => m.userId);

    if (memberIds.length === 0) return [];

    return this.wishRepository
      .createQueryBuilder("wish")
      .leftJoinAndSelect("wish.user", "user")
      .leftJoinAndSelect(
        "wish.reservedBy",
        "reservedBy",
        "reservedBy.id != :userId",
        { userId },
      )
      .where("wish.userId IN (:...memberIds)", { memberIds })
      .orderBy("wish.id", "DESC")
      .getMany();
  }

  private async assertMember(userId: string, groupId: string): Promise<void> {
    const membership = await this.memberRepository.findOne({
      where: { groupId, userId },
    });
    if (!membership)
      throw new ForbiddenException("You are not a member of this group");
  }

  private async assertOwner(userId: string, groupId: string): Promise<void> {
    const membership = await this.memberRepository.findOne({
      where: { groupId, userId },
    });
    if (!membership || membership.role !== GroupRole.OWNER)
      throw new ForbiddenException(
        "Only the group owner can perform this action",
      );
  }
}
