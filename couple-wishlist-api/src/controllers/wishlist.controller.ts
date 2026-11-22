import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import { WishlistService } from "../services/wishlist.service";
import { UpdateWishlistDto } from "../dto/wishlist/update-wishlist.dto";
import { CreateWishlistDto } from "../dto/wishlist/create-wishlist.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { GetUser } from "../decorators/get-user.decorator";
import { PaginationDto } from "../dto/common/pagination.dto";

@Controller("wishlist")
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  create(@GetUser("userId") userId: string, @Body() dto: CreateWishlistDto) {
    return this.wishlistService.create(userId, dto);
  }

  @Get()
  findAll(
    @GetUser("userId") userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.wishlistService.findAll(userId, pagination);
  }

  @Get(":id")
  findOne(
    @GetUser("userId") userId: string,
    @Param("id", ParseUUIDPipe) wishId: string,
  ) {
    return this.wishlistService.findOne(userId, wishId);
  }

  @Delete(":id")
  remove(
    @GetUser("userId") userId: string,
    @Param("id", ParseUUIDPipe) wishId: string,
  ) {
    return this.wishlistService.remove(userId, wishId);
  }

  @Patch(":id")
  update(
    @GetUser("userId") userId: string,
    @Param("id", ParseUUIDPipe) wishId: string,
    @Body() dto: UpdateWishlistDto,
  ) {
    return this.wishlistService.update(userId, wishId, dto);
  }

  @Post(":id/reserve")
  reserveWish(
    @GetUser("userId") userId: string,
    @Param("id", ParseUUIDPipe) wishId: string,
  ) {
    return this.wishlistService.reserveWish(userId, wishId);
  }

  @Delete(":id/reserve")
  @HttpCode(HttpStatus.NO_CONTENT)
  unreserveWish(
    @GetUser("userId") userId: string,
    @Param("id", ParseUUIDPipe) wishId: string,
  ) {
    return this.wishlistService.unreserveWish(userId, wishId);
  }
}
