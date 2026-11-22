import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WishItem, Priority } from "../models/wish-item.model";
import { GroupMember } from "../models/group-member.model";
import { CreateWishlistDto } from "../dto/wishlist/create-wishlist.dto";
import { UpdateWishlistDto } from "../dto/wishlist/update-wishlist.dto";
import { PaginationDto, PaginatedResult } from "../dto/common/pagination.dto";
import { WishResponseDto } from "../dto/wishlist/wish-response.dto";

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishItem)
    private readonly wishRepository: Repository<WishItem>,
    @InjectRepository(GroupMember)
    private readonly memberRepository: Repository<GroupMember>,
  ) {}

  async create(userId: string, dto: CreateWishlistDto) {
    const wish = this.wishRepository.create({
      title: dto.title,
      description: dto.description,
      price: dto.price ?? 0,
      link: dto.link,
      priority: dto.priority ?? Priority.MEDIUM,
      userId,
    });

    return await this.wishRepository.save(wish);
  }

  async findAll(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<WishResponseDto>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const [data, total] = await this.wishRepository.findAndCount({
      where: { userId },
      order: { id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
      relations: ["user", "reservedBy"],
    });

    const mappedData = data.map((wish) => new WishResponseDto(wish, userId));
    return new PaginatedResult(mappedData, total, page, limit);
  }

  async findOne(userId: string, id: string) {
    const wish = await this.wishRepository.findOne({
      where: { id, userId },
      relations: ["user", "reservedBy"],
    });
    if (!wish) {
      throw new NotFoundException("Wish item not found");
    }
    return new WishResponseDto(wish, userId);
  }

  async remove(userId: string, id: string) {
    const wish = await this.wishRepository.findOne({
      where: { id, userId },
    });

    if (!wish) {
      throw new NotFoundException(
        "Wish item not found or you stay away from it",
      );
    }
    return await this.wishRepository.remove(wish);
  }

  async update(userId: string, id: string, dto: UpdateWishlistDto) {
    const wish = await this.wishRepository.findOne({
      where: { id, userId },
    });
    if (!wish) {
      throw new NotFoundException("Wish item not found");
    }
    if (dto.title !== undefined) wish.title = dto.title;
    if (dto.description !== undefined) wish.description = dto.description;
    if (dto.price !== undefined) wish.price = dto.price;
    if (dto.link !== undefined) wish.link = dto.link;
    if (dto.priority !== undefined) wish.priority = dto.priority;
    if (dto.isInCart !== undefined) wish.isInCart = dto.isInCart;
    const saved = await this.wishRepository.save(wish);
    return new WishResponseDto(saved, userId);
  }

  private async assertSharedGroup(
    userId1: string,
    userId2: string,
  ): Promise<void> {
    if (userId1 === userId2) return;

    const sharedGroup = await this.memberRepository
      .createQueryBuilder("m1")
      .innerJoin("group_member", "m2", "m1.groupId = m2.groupId")
      .where("m1.userId = :userId1", { userId1 })
      .andWhere("m2.userId = :userId2", { userId2 })
      .getOne();

    if (!sharedGroup) {
      throw new ForbiddenException(
        "You can only reserve wishes from users in your groups",
      );
    }
  }

  async reserveWish(requesterId: string, wishId: string) {
    const wish = await this.wishRepository.findOne({
      where: { id: wishId },
      relations: ["user", "reservedBy"],
    });
    if (!wish) throw new NotFoundException("Wish item not found");
    if (wish.userId === requesterId) {
      throw new BadRequestException("You cannot reserve your own wish");
    }
    if (wish.reservedById) {
      throw new BadRequestException("This wish is already reserved");
    }
    await this.assertSharedGroup(requesterId, wish.userId);
    wish.reservedById = requesterId;
    const saved = await this.wishRepository.save(wish);
    return new WishResponseDto(saved, requesterId);
  }

  /** Cancel a reservation. */
  async unreserveWish(requesterId: string, wishId: string) {
    const wish = await this.wishRepository.findOne({
      where: { id: wishId },
      relations: ["user", "reservedBy"],
    });
    if (!wish) throw new NotFoundException("Wish item not found");
    if (wish.reservedById !== requesterId) {
      throw new BadRequestException("You have not reserved this wish");
    }
    wish.reservedById = null;
    const saved = await this.wishRepository.save(wish);
    return new WishResponseDto(saved, requesterId);
  }
}
