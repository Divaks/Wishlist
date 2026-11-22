import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { UsersService } from "../services/users.service";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { GetUser } from "../decorators/get-user.decorator";
import { type ActiveUser } from "../interfaces/active-user.interface";
import { UpdateUserDto } from "../dto/users/update-user.dto";

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("profile")
  getProfile(@GetUser() user: ActiveUser): ActiveUser {
    return user;
  }

  @Patch("profile")
  updateProfile(@GetUser("userId") userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Delete("account")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(@GetUser("userId") userId: string) {
    return this.usersService.deleteAccount(userId);
  }
}
