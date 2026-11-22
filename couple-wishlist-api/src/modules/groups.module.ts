import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GroupsService } from "../services/groups.service";
import { GroupsController } from "../controllers/groups.controller";
import { Group } from "../models/group.model";
import { GroupMember } from "../models/group-member.model";
import { User } from "../models/user.model";
import { WishItem } from "../models/wish-item.model";

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupMember, User, WishItem])],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
