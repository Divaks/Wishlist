import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  create(@GetUser('userId') userId: string, @Body() dto: CreateWishlistDto) {
    return this.wishlistService.create(userId, dto);
  }
  @Get()
  findAll(@GetUser('userId') userId: string) {
    return this.wishlistService.findAll(userId);
  }
  @Delete(':id')
  remove(@GetUser('userId') userId: string, @Param('id') wishId: string) {
    return this.wishlistService.remove(userId, wishId);
  }
  @Patch(':id')
  update(
    @GetUser('userId') userId: string,
    @Param('id') wishId: string,
    @Body() dto: UpdateWishlistDto,
  ) {
    return this.wishlistService.update(userId, wishId, dto);
  }
  @Get('partner')
  getPartnerWishlist(@GetUser('userId') userId: string) {
    return this.wishlistService.findPartnerWishlist(userId);
  }
}
