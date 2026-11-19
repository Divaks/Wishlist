import { IsString, IsOptional, IsNumber, IsUrl } from 'class-validator';

export class UpdateWishlistDto {
  @IsString()
  @IsOptional()
  title: string;
  @IsString()
  @IsOptional()
  description?: string;
  @IsNumber()
  @IsOptional()
  price?: number;
  @IsUrl()
  @IsOptional()
  url?: string;
}
