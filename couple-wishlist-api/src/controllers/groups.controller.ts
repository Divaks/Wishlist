import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import { GroupsService } from "../services/groups.service";
import { CreateGroupDto } from "../dto/groups/create-group.dto";
import { UpdateGroupDto } from "../dto/groups/update-group.dto";
import { InviteMemberDto } from "../dto/groups/invite-member.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { GetUser } from "../decorators/get-user.decorator";
import { PaginationDto } from "../dto/common/pagination.dto";

@Controller("groups")
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@GetUser("userId") userId: string, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(userId, dto);
  }

  @Get()
  async findMyGroupsArray(@GetUser("userId") userId: string) {
    return (await this.groupsService.findMyGroups(userId, null)).data;
  }

  @Get("paged")
  findMyGroups(
    @GetUser("userId") userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.groupsService.findMyGroups(userId, pagination);
  }

  @Get("invitations")
  invitations(@GetUser("userId") userId: string) {
    return this.groupsService.invitations(userId);
  }

  @Post(":groupId/invitations/accept")
  @HttpCode(HttpStatus.NO_CONTENT)
  accept(
    @GetUser("userId") userId: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
  ) {
    return this.groupsService.acceptInvitation(userId, groupId);
  }

  @Get(":groupId")
  findOne(
    @GetUser("userId") userId: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
  ) {
    return this.groupsService.findOne(userId, groupId);
  }

  @Patch(":groupId")
  update(
    @GetUser("userId") userId: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(userId, groupId, dto);
  }

  @Delete(":groupId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @GetUser("userId") userId: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
  ) {
    return this.groupsService.remove(userId, groupId);
  }

  @Post(":groupId/members")
  inviteMember(
    @GetUser("userId") userId: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.groupsService.inviteMember(userId, groupId, dto.email);
  }

  @Delete(":groupId/members/:targetUserId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @GetUser("userId") userId: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Param("targetUserId", ParseUUIDPipe) targetUserId: string,
  ) {
    return this.groupsService.removeMember(userId, groupId, targetUserId);
  }

  @Post(":groupId/members/:targetUserId/transfer-ownership")
  @HttpCode(HttpStatus.NO_CONTENT)
  transferOwnership(
    @GetUser("userId") userId: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Param("targetUserId", ParseUUIDPipe) targetUserId: string,
  ) {
    return this.groupsService.transferOwnership(userId, groupId, targetUserId);
  }

  @Delete(":groupId/leave")
  @HttpCode(HttpStatus.NO_CONTENT)
  leaveGroup(
    @GetUser("userId") userId: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
  ) {
    return this.groupsService.removeMember(userId, groupId, userId);
  }

  @Get(":groupId/wishes")
  async getGroupWishesArray(
    @GetUser("userId") userId: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
  ) {
    return (await this.groupsService.getGroupWishes(userId, groupId, null))
      .data;
  }

  @Get(":groupId/wishes/paged")
  getGroupWishes(
    @GetUser("userId") userId: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.groupsService.getGroupWishes(userId, groupId, pagination);
  }

  @Get(":groupId/wishes/:memberId")
  getMemberWishes(
    @GetUser("userId") userId: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.groupsService.getMemberWishes(
      userId,
      groupId,
      memberId,
      pagination,
    );
  }
}
