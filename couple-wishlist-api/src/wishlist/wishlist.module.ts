import { Module } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishItem } from '../entities/wish-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WishItem])],
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
