import {
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  IsEnum,
  IsBoolean,
  ValidateIf,
} from "class-validator";
import { Priority } from "../../models/wish-item.model";

export class UpdateWishlistDto {
  @IsString()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  price?: number;

  @IsUrl({ protocols: ["http", "https"] })
  @IsOptional()
  link?: string;

  @IsEnum(Priority)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  priority?: Priority;

  @IsBoolean()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  isInCart?: boolean;
}
