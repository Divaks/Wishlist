import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Put,
  UploadedFile,
  UseInterceptors,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { wishPhotoUploadOptions } from "../wish-photo-upload";
import { WishIdPipe } from "../wish-id.pipe";
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
  async findAllArray(@GetUser("userId") userId: string) {
    return (await this.wishlistService.findAll(userId, null)).data;
  }

  @Get("paged")
  findAll(
    @GetUser("userId") userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.wishlistService.findAll(userId, pagination);
  }

  @Get(":id")
  findOne(
    @GetUser("userId") userId: string,
    @Param("id", WishIdPipe) wishId: string,
  ) {
    return this.wishlistService.findOne(userId, wishId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @GetUser("userId") userId: string,
    @Param("id", WishIdPipe) wishId: string,
  ) {
    return this.wishlistService.remove(userId, wishId);
  }

  @Patch(":id")
  update(
    @GetUser("userId") userId: string,
    @Param("id", WishIdPipe) wishId: string,
    @Body() dto: UpdateWishlistDto,
  ) {
    return this.wishlistService.update(userId, wishId, dto);
  }

  @Put(":id/photo")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(FileInterceptor("photo", wishPhotoUploadOptions))
  uploadPhoto(
    @GetUser("userId") userId: string,
    @Param("id", WishIdPipe) wishId: string,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.wishlistService.uploadPhoto(userId, wishId, photo);
  }

  @Delete(":id/photo")
  @HttpCode(HttpStatus.NO_CONTENT)
  removePhoto(
    @GetUser("userId") userId: string,
    @Param("id", WishIdPipe) wishId: string,
  ) {
    return this.wishlistService.removePhoto(userId, wishId);
  }

  @Post(":id/reserve")
  reserveWish(
    @GetUser("userId") userId: string,
    @Param("id", WishIdPipe) wishId: string,
  ) {
    return this.wishlistService.reserveWish(userId, wishId);
  }

  @Delete(":id/reserve")
  @HttpCode(HttpStatus.NO_CONTENT)
  unreserveWish(
    @GetUser("userId") userId: string,
    @Param("id", WishIdPipe) wishId: string,
  ) {
    return this.wishlistService.unreserveWish(userId, wishId);
  }
}
