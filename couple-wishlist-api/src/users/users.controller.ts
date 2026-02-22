import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { type ActiveUser } from './interfaces/active-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get('profile')
  getProfile(@GetUser() user: ActiveUser): ActiveUser {
    return user;
  }
  @Post('generate-code')
  generateCode(@GetUser('userId') userId: string) {
    return this.usersService.generateInviteCode(userId);
  }
  @Post('connect')
  connect(@GetUser('userId') userId: string, @Body('code') inviteCode: string) {
    return this.usersService.connectPartner(userId, inviteCode);
  }
}
