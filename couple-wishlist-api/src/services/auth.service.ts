import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "./users.service";
import * as bcrypt from "bcrypt";
import { CreateUserDto } from "../dto/users/create-user.dto";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}
  async login(email: string, pass: string) {
    const user = await this.usersService.findOneByEmailWithPassword(email);

    // Якщо юзера нема або пароль не підійшов — кидаємо помилку
    if (!user || !(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const payload = {
      sub: user.id,
      email: user.email,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
  async register(dto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });
    return { id: user.id, email: user.email, name: user.name };
  }
}
