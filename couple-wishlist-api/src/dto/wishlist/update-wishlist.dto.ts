import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsUrl,
  IsEnum,
  IsBoolean,
  ValidateIf,
} from "class-validator";
import { Priority, WishCurrency } from "../../models/wish-item.model";

export class UpdateWishlistDto {
  @IsString()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(-99_999_999.99)
  @Max(99_999_999.99)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  price?: number;

  @IsEnum(WishCurrency)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  currency?: WishCurrency;

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
