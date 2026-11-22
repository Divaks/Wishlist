import { Controller, Post, Body } from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import { LoginDto } from "../dto/auth/login.dto";
import { CreateUserDto } from "../dto/users/create-user.dto";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post("register")
  create(@Body() registerDto: CreateUserDto) {
    return this.authService.register(registerDto);
  }
}
