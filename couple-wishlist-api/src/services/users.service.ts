import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import { User } from "../models/user.model";
import { CreateUserDto } from "../dto/users/create-user.dto";

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
    const { email, password, name } = createUserDto;
    const newUser = this.usersRepository.create({
      email,
      password,
      name,
    });
    try {
      return await this.usersRepository.save(newUser);
    } catch (err) {
      const code = (err as { driverError?: { code?: string } }).driverError
        ?.code;
      if (err instanceof QueryFailedError && code === "23505") {
        throw new ConflictException("Email is already registered");
      }
      throw err;
    }
  }

  async findOne(id: string) {
    return await this.usersRepository.findOne({
      where: { id: id },
    });
  }

  async findOneByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: ["id", "email", "password", "partnerId"],
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
      throw new NotFoundException("Invalid code");
    }
    if (partner.id === userId) {
      throw new BadRequestException("Can not invite yourself");
    }
    await this.usersRepository.update(userId, { partnerId: partner.id });
    await this.usersRepository.update(partner.id, { partnerId: userId });
    return { inviteCode: code };
  }
}
