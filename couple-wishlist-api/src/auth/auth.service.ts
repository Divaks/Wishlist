import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}
  async login(email: string, pass: string) {
    const user = await this.usersService.findOneByEmailWithPassword(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const payload = {
        sub: user.id,
        email: user.email,
        partnerId: user.partnerId,
      };
      return {
        accessToken: this.jwtService.sign(payload),
      };
    }
  }
}
