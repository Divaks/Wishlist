import {
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
  Matches,
} from "class-validator";

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  @IsOptional()
  birthday?: string | null;
}
