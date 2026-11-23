import { IsString, IsOptional, IsNotEmpty, ValidateIf } from "class-validator";

export class UpdateGroupDto {
  @IsString()
  @IsNotEmpty()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
