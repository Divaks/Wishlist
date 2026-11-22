import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { UsersService } from "../services/users.service";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { GetUser } from "../decorators/get-user.decorator";
import { type ActiveUser } from "../interfaces/active-user.interface";

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get("profile")
  getProfile(@GetUser() user: ActiveUser): ActiveUser {
    return user;
  }
  @Post("generate-code")
  generateCode(@GetUser("userId") userId: string) {
    return this.usersService.generateInviteCode(userId);
  }
  @Post("connect")
  connect(@GetUser("userId") userId: string, @Body("code") inviteCode: string) {
    return this.usersService.connectPartner(userId, inviteCode);
  }
}
