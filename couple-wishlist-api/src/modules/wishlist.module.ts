import { Module } from "@nestjs/common";
import { WishlistService } from "../services/wishlist.service";
import { WishlistController } from "../controllers/wishlist.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WishItem } from "../models/wish-item.model";
import { UsersModule } from "./users.module";

@Module({
  imports: [TypeOrmModule.forFeature([WishItem]), UsersModule],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
