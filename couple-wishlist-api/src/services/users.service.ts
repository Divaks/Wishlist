import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import { Group } from "../models/group.model";
import { GroupMember } from "../models/group-member.model";
import { WishItem } from "../models/wish-item.model";
import { User } from "../models/user.model";
import { CreateUserDto } from "../dto/users/create-user.dto";
import { UpdateUserDto } from "../dto/users/update-user.dto";

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
      email: email.toLowerCase(),
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
      where: { email: email.toLowerCase() },
      select: ["id", "email", "password"],
    });
  }

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.birthday !== undefined) user.birthday = dto.birthday;
    return await this.usersRepository.save(user);
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.usersRepository.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: "pessimistic_write" },
      });
      if (!user) throw new NotFoundException("User not found");
      if (await manager.existsBy(Group, { createdById: userId }))
        throw new ConflictException(
          "Transfer or delete your groups before deleting your account",
        );
      await manager.update(
        WishItem,
        { reservedById: userId },
        { reservedById: null },
      );
      await manager.delete(WishItem, { userId });
      await manager.delete(GroupMember, { userId });
      await manager.remove(user);
    });
  }
}
