import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WishPhotoCleanup } from "../models/wish-photo-cleanup.model";
import { WishPhotosService } from "../services/wish-photos.service";
import { WishPhotoStorage } from "../services/wish-photo-storage.service";

@Module({
  imports: [TypeOrmModule.forFeature([WishPhotoCleanup])],
  providers: [WishPhotosService, WishPhotoStorage],
  exports: [WishPhotosService],
})
export class WishPhotosModule {}
