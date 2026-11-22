import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsByteLength,
} from "class-validator";

export class CreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @IsByteLength(0, 72, { message: "Password must be at most 72 UTF-8 bytes" })
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;
}
