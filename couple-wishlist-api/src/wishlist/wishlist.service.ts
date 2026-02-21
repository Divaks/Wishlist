import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { WishItem } from '../entities/wish-item.entity';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishItem)
    private readonly wishRepository: Repository<WishItem>,
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
}
