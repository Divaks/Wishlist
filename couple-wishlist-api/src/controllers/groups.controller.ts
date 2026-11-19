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
} from "@nestjs/common";
import { GroupsService } from "../services/groups.service";
import { CreateGroupDto } from "../dto/groups/create-group.dto";
import { UpdateGroupDto } from "../dto/groups/update-group.dto";
import { InviteMemberDto } from "../dto/groups/invite-member.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { GetUser } from "../decorators/get-user.decorator";

@Controller("groups")
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@GetUser("userId") userId: string, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(userId, dto);
  }

  @Get()
  findMyGroups(@GetUser("userId") userId: string) {
    return this.groupsService.findMyGroups(userId);
  }

  @Get(":groupId")
  findOne(
    @GetUser("userId") userId: string,
    @Param("groupId") groupId: string,
  ) {
    return this.groupsService.findOne(userId, groupId);
  }

  @Patch(":groupId")
  update(
    @GetUser("userId") userId: string,
    @Param("groupId") groupId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(userId, groupId, dto);
  }

  @Delete(":groupId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@GetUser("userId") userId: string, @Param("groupId") groupId: string) {
    return this.groupsService.remove(userId, groupId);
  }

  @Post(":groupId/members")
  inviteMember(
    @GetUser("userId") userId: string,
    @Param("groupId") groupId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.groupsService.inviteMember(userId, groupId, dto.email);
  }

  @Delete(":groupId/members/:targetUserId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @GetUser("userId") userId: string,
    @Param("groupId") groupId: string,
    @Param("targetUserId") targetUserId: string,
  ) {
    return this.groupsService.removeMember(userId, groupId, targetUserId);
  }

  @Get(":groupId/wishes")
  getGroupWishes(
    @GetUser("userId") userId: string,
    @Param("groupId") groupId: string,
  ) {
    return this.groupsService.getGroupWishes(userId, groupId);
  }
}
