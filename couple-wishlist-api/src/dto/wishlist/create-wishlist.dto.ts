import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUrl,
  IsEnum,
  IsBoolean,
} from "class-validator";
import { Priority } from "../../models/wish-item.model";

export class CreateWishlistDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsUrl({ protocols: ["http", "https"] })
  @IsOptional()
  link?: string;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsBoolean()
  @IsOptional()
  isInCart?: boolean;
}
