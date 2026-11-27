import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { Group } from "../models/group.model";
import { GroupMember, GroupRole } from "../models/group-member.model";
import { User } from "../models/user.model";
import { WishItem } from "../models/wish-item.model";
import { CreateGroupDto } from "../dto/groups/create-group.dto";
import { UpdateGroupDto } from "../dto/groups/update-group.dto";
import { PaginationDto, PaginatedResult } from "../dto/common/pagination.dto";
import { WishResponseDto } from "../dto/wishlist/wish-response.dto";
import { WishPhotosService } from "./wish-photos.service";

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
    private readonly photos: WishPhotosService,
  ) {}

  async create(userId: string, dto: CreateGroupDto): Promise<Group> {
    const saved = await this.groupRepository.manager.transaction(
      async (manager) => {
        const groups = manager.getRepository(Group);
        const group = await groups.save(
          groups.create({ ...dto, createdById: userId }),
        );
        const members = manager.getRepository(GroupMember);
        await members.save(
          members.create({ groupId: group.id, userId, role: GroupRole.OWNER }),
        );
        return group;
      },
    );
    return this.findOne(userId, saved.id);
  }

  async findMyGroups(
    userId: string,
    pagination: PaginationDto | null,
  ): Promise<PaginatedResult<Group>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;

    const qb = this.groupRepository
      .createQueryBuilder("group")
      .innerJoin("group.members", "member", "member.userId = :userId", {
        userId,
      })
      .leftJoinAndSelect("group.members", "allMembers")
      .leftJoinAndSelect("allMembers.user", "memberUser")
      .leftJoinAndSelect("group.createdBy", "creator")
      .orderBy("group.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(pagination ? limit : undefined);

    const [data, total] = await qb.getManyAndCount();

    return new PaginatedResult(data, total, page, limit);
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
    if (dto.name !== undefined || dto.description !== undefined) {
      const result = await this.groupRepository.update(
        { id: groupId, createdById: userId },
        dto,
      );
      if (!result.affected) throw new NotFoundException("Group not found");
    }
    return this.findOne(userId, groupId);
  }

  async remove(userId: string, groupId: string): Promise<void> {
    await this.assertOwner(userId, groupId);
    const result = await this.groupRepository.delete({
      id: groupId,
      createdById: userId,
    });
    if (!result.affected) throw new NotFoundException("Group not found");
  }

  async inviteMember(requesterId: string, groupId: string, email: string) {
    await this.assertOwner(requesterId, groupId);

    const target = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!target) throw new NotFoundException(`No user with email ${email}`);

    const existing = await this.memberRepository.findOne({
      where: { groupId, userId: target.id },
    });
    if (existing) throw new ConflictException("User is already in this group");

    const pending = await this.groupRepository.query<{ groupId: string }[]>(
      `INSERT INTO group_invitation ("groupId","userId")
       SELECT id,$2 FROM "group" WHERE id=$1 AND "createdById"=$3 FOR SHARE
       ON CONFLICT ("groupId","userId") DO UPDATE SET "userId"=EXCLUDED."userId"
       RETURNING "groupId"`,
      [groupId, target.id, requesterId],
    );
    if (!pending.length)
      throw new ForbiddenException("Group ownership changed");
    return { groupId, userId: target.id, status: "pending" };
  }

  async invitations(userId: string): Promise<{ groupId: string }[]> {
    return this.groupRepository.query<{ groupId: string }[]>(
      'SELECT "groupId" FROM group_invitation WHERE "userId"=$1 ORDER BY "groupId"',
      [userId],
    );
  }

  async acceptInvitation(userId: string, groupId: string): Promise<void> {
    await this.groupRepository.manager.transaction(async (manager) => {
      const rows: { id: string }[] = await manager.query(
        'WITH accepted AS (DELETE FROM group_invitation WHERE "groupId"=$1 AND "userId"=$2 RETURNING *) INSERT INTO group_member ("groupId","userId") SELECT "groupId","userId" FROM accepted RETURNING id',
        [groupId, userId],
      );
      if (!rows.length) throw new NotFoundException("Invitation not found");
    });
  }

  private async lockGroup(manager: EntityManager, groupId: string) {
    const group = await manager.findOne(Group, {
      where: { id: groupId },
      lock: { mode: "pessimistic_write" },
    });
    if (!group) throw new NotFoundException("Group not found");
    return group;
  }

  async removeMember(
    requesterId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.groupRepository.manager.transaction(async (manager) => {
      const group = await this.lockGroup(manager, groupId);
      if (
        group.createdById === targetUserId ||
        (group.createdById !== requesterId && requesterId !== targetUserId)
      )
        throw new ForbiddenException("Cannot remove this member");
      const result = await manager.delete(GroupMember, {
        groupId,
        userId: targetUserId,
      });
      if (!result.affected) throw new NotFoundException("Member not found");
    });
  }

  async transferOwnership(
    requesterId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.groupRepository.manager.transaction(async (manager) => {
      const group = await this.lockGroup(manager, groupId);
      if (group.createdById !== requesterId)
        throw new ForbiddenException("Only the owner can transfer ownership");
      if (requesterId === targetUserId)
        throw new BadRequestException("Already owner");
      await manager.update(
        GroupMember,
        { groupId, userId: requesterId },
        { role: GroupRole.MEMBER },
      );
      const promoted = await manager.update(
        GroupMember,
        { groupId, userId: targetUserId },
        { role: GroupRole.OWNER },
      );
      if (!promoted.affected) throw new NotFoundException("Member not found");
      await manager.update(Group, groupId, { createdById: targetUserId });
    });
  }

  async getGroupWishes(
    userId: string,
    groupId: string,
    pagination: PaginationDto | null,
  ): Promise<PaginatedResult<WishResponseDto>> {
    await this.assertMember(userId, groupId);

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;

    const members = await this.memberRepository.find({
      where: { groupId },
      select: ["userId"],
    });
    const memberIds = members.map((m) => m.userId);

    if (memberIds.length === 0) {
      return new PaginatedResult([], 0, page, limit);
    }

    const qb = this.wishRepository
      .createQueryBuilder("wish")
      .leftJoinAndSelect("wish.user", "user")
      .leftJoinAndSelect(
        "wish.reservedBy",
        "reservedBy",
        "reservedBy.id != :userId",
        { userId },
      )
      .where("wish.userId IN (:...memberIds)", { memberIds })
      .orderBy("wish.createdAt", "DESC")
      .addOrderBy("wish.id", "DESC")
      .skip((page - 1) * limit)
      .take(pagination ? limit : undefined);

    const [data, total] = await qb.getManyAndCount();

    const mappedData = await Promise.all(
      data.map((wish) => this.photos.response(wish, userId)),
    );
    return new PaginatedResult(mappedData, total, page, limit);
  }

  async getMemberWishes(
    userId: string,
    groupId: string,
    memberId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<WishResponseDto>> {
    await this.assertMember(userId, groupId);

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    // Verify the memberId is actually a member of this group
    const targetMember = await this.memberRepository.findOne({
      where: { groupId, userId: memberId },
    });
    if (!targetMember)
      throw new NotFoundException("User is not a member of this group");

    const [data, total] = await this.wishRepository.findAndCount({
      where: { userId: memberId },
      order: { createdAt: "DESC", id: "DESC" },
      relations: ["user", "reservedBy"],
      skip: (page - 1) * limit,
      take: limit,
    });

    const mappedData = await Promise.all(
      data.map((wish) => this.photos.response(wish, userId)),
    );
    return new PaginatedResult(mappedData, total, page, limit);
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
