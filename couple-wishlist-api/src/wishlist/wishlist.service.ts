import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { WishItem } from '../entities/wish-item.entity';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { UsersService } from '../users/users.service';
@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishItem)
    private readonly wishRepository: Repository<WishItem>,
    private readonly usersService: UsersService,
  ) {}
  async create(userId: string, dto: CreateWishlistDto) {
    const user = new User();
    user.id = userId;

    const wish = this.wishRepository.create({
      ...dto,
      user: user,
    });

    return await this.wishRepository.save(wish);
  }

  async findAll(userId: string) {
    return this.wishRepository.find({
      where: { user: { id: userId } },
      order: { id: 'DESC' },
    });
  }

  async remove(userId: string, id: string) {
    const wish = await this.wishRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!wish) {
      throw new NotFoundException(
        'Wish item not found or you stay away from it',
      );
    }
    return await this.wishRepository.remove(wish);
  }

  async update(userId: string, id: string, dto: UpdateWishlistDto) {
    const wish = await this.wishRepository.findOne({
      where: { id, user: { id: userId } },
    });
    if (!wish) {
      throw new NotFoundException('Wish item not found');
    }
    Object.assign(wish, dto);
    return await this.wishRepository.save(wish);
  }

  async findPartnerWishlist(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.partnerId) {
      throw new BadRequestException('You have no connected partner');
    }
    return this.wishRepository.find({
      where: { user: { id: user.partnerId } },
      order: { id: 'DESC' },
    });
  }
}
