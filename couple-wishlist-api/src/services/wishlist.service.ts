import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
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
  ) {}

  async create(userId: string, dto: CreateWishlistDto) {
    const wish = this.wishRepository.create({
      title: dto.title,
      description: dto.description,
      price: dto.price ?? 0,
      link: dto.link,
      isInCart: dto.isInCart ?? false,
      priority: dto.priority ?? Priority.MEDIUM,
      userId,
    });

    const saved = await this.wishRepository.save(wish);
    return new WishResponseDto(saved, userId);
  }

  async findAll(
    userId: string,
    pagination: PaginationDto | null,
  ): Promise<PaginatedResult<WishResponseDto>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;

    const [data, total] = await this.wishRepository.findAndCount({
      where: { userId },
      order: { createdAt: "DESC", id: "DESC" },
      skip: (page - 1) * limit,
      take: pagination ? limit : undefined,
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
    await this.wishRepository.remove(wish);
  }

  async update(userId: string, id: string, dto: UpdateWishlistDto) {
    if (Object.keys(dto).length) {
      const updated = await this.wishRepository.update({ id, userId }, dto);
      if (!updated.affected) throw new NotFoundException("Wish item not found");
    }
    return this.findOne(userId, id);
  }

  private async assertSharedGroup(
    members: Repository<GroupMember>,
    userId1: string,
    userId2: string,
  ): Promise<void> {
    const sharedGroup = await members
      .createQueryBuilder("m1")
      .innerJoin("group_member", "m2", "m1.groupId = m2.groupId")
      .where("m1.userId = :userId1", { userId1 })
      .andWhere("m2.userId = :userId2", { userId2 })
      .setLock("pessimistic_read")
      .getOne();

    if (!sharedGroup) {
      throw new NotFoundException("Wish item not found");
    }
  }

  async reserveWish(requesterId: string, wishId: string) {
    return this.wishRepository.manager.transaction(async (manager) => {
      const wishes = manager.getRepository(WishItem);
      const wish = await wishes.findOne({
        where: { id: wishId },
        relations: ["user", "reservedBy"],
      });
      if (!wish) throw new NotFoundException("Wish item not found");
      if (wish.userId === requesterId) {
        throw new BadRequestException("You cannot reserve your own wish");
      }
      await this.assertSharedGroup(
        manager.getRepository(GroupMember),
        requesterId,
        wish.userId,
      );
      const result = await wishes.update(
        { id: wishId, reservedById: IsNull() },
        { reservedById: requesterId },
      );
      if (!result.affected)
        throw new ConflictException("Wish already reserved");
      wish.reservedById = requesterId;
      return new WishResponseDto(wish, requesterId);
    });
  }

  async unreserveWish(requesterId: string, wishId: string) {
    const result = await this.wishRepository.update(
      { id: wishId, reservedById: requesterId },
      { reservedById: null },
    );
    if (!result.affected) throw new NotFoundException("Reservation not found");
  }
}
