import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from "class-validator";

export class CreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @MaxLength(72, { message: "Password must be at most 72 characters" })
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;
}
