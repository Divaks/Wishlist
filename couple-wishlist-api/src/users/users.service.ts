import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}
  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;
    const newUser = this.usersRepository.create({
      email,
      password: password,
    });
    return this.usersRepository.save(newUser);
  }

  async findOne(id: string) {
    return await this.usersRepository.findOne({
      where: { id: id },
    });
  }

  async findOneByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'partnerId'],
    });
  }

  async generateInviteCode(userId: string) {
    const code = Math.random().toString(36).substr(2, 8).toUpperCase();
    await this.usersRepository.update(userId, { inviteCode: code });
    return { inviteCode: code };
  }

  async connectPartner(userId: string, code: string) {
    const partner = await this.usersRepository.findOne({
      where: { inviteCode: code },
    });

    if (!partner) {
      throw new NotFoundException('Invalid code');
    }
    if (partner.id === userId) {
      throw new BadRequestException('Can not invite yourself');
    }
    await this.usersRepository.update(userId, { partnerId: partner.id });
    await this.usersRepository.update(partner.id, { partnerId: userId });
    return { inviteCode: code };
  }
}
