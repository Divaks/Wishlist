import { IsOptional, IsString, MaxLength, IsDateString } from "class-validator";

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsDateString()
  @IsOptional()
  birthday?: string;
}
