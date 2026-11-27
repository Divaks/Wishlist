import { Module } from "@nestjs/common";
import { WishlistService } from "../services/wishlist.service";
import { WishlistController } from "../controllers/wishlist.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WishItem } from "../models/wish-item.model";
import { GroupMember } from "../models/group-member.model";
import { WishPhotosModule } from "./wish-photos.module";

@Module({
  imports: [
    WishPhotosModule,
    TypeOrmModule.forFeature([WishItem, GroupMember]),
  ],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
