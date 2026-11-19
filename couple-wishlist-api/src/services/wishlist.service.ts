import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishItem } from '../models/wish-item.model';
import { CreateWishlistDto } from '../dto/wishlist/create-wishlist.dto';
import { UpdateWishlistDto } from '../dto/wishlist/update-wishlist.dto';
import { UsersService } from './users.service';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishItem)
    private readonly wishRepository: Repository<WishItem>,
    private readonly usersService: UsersService,
  ) {}
  async create(userId: string, dto: CreateWishlistDto) {
    const wish = this.wishRepository.create({
      ...dto,
      userId,
    });

    return await this.wishRepository.save(wish);
  }

  async findAll(userId: string) {
    return this.wishRepository.find({
      where: { userId },
      order: { id: 'DESC' },
    });
  }

  async remove(userId: string, id: string) {
    const wish = await this.wishRepository.findOne({
      where: { id, userId },
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
      where: { id, userId },
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
      where: { userId: user.partnerId },
      order: { id: 'DESC' },
    });
  }

  async reserveWish(requesterId: string, wishId: string) {
    const wish = await this.wishRepository.findOne({ where: { id: wishId } });
    if (!wish) throw new NotFoundException('Wish item not found');
    if (wish.userId === requesterId) {
      throw new BadRequestException('You cannot reserve your own wish');
    }
    wish.reservedById = requesterId;
    return this.wishRepository.save(wish);
  }

  /** Cancel a reservation. */
  async unreserveWish(requesterId: string, wishId: string) {
    const wish = await this.wishRepository.findOne({ where: { id: wishId } });
    if (!wish) throw new NotFoundException('Wish item not found');
    if (wish.reservedById !== requesterId) {
      throw new BadRequestException('You have not reserved this wish');
    }
    wish.reservedById = null;
    return this.wishRepository.save(wish);
  }
}
