import { Expose, Type } from "class-transformer";
import { WishCurrency, WishItem } from "../../models/wish-item.model";
import { UserResponseDto } from "../users/user-response.dto";

export class WishResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description: string | null;

  @Expose()
  price: number;

  @Expose()
  currency: WishCurrency;

  @Expose()
  link: string | null;

  @Expose()
  photoUrl: string | null;

  @Expose()
  priority: string;

  @Expose()
  isInCart: boolean;

  @Expose()
  occasion: string | null;

  @Expose()
  occasionDate: string | null;

  @Expose()
  userId: string;

  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto | null;

  @Expose()
  reservedById: string | null;

  @Expose()
  @Type(() => UserResponseDto)
  reservedBy: UserResponseDto | null;

  isReserved: boolean;

  constructor(
    wish: WishItem,
    viewerId?: string,
    photoUrl: string | null = null,
  ) {
    this.photoUrl = photoUrl;
    this.id = wish.id;
    this.title = wish.title;
    this.description = wish.description;
    this.price = Number(wish.price);
    this.currency = wish.currency ?? WishCurrency.UAH;
    this.link = wish.link;
    this.priority = wish.priority;
    this.isInCart = wish.isInCart;
    this.occasion = wish.occasion;
    this.occasionDate = wish.occasionDate;
    this.userId = wish.userId;
    this.user = wish.user ? new UserResponseDto(wish.user) : null;
    this.isReserved = viewerId !== wish.userId && Boolean(wish.reservedById);
    this.reservedById =
      viewerId && wish.reservedById === viewerId ? viewerId : null;
    this.reservedBy =
      this.reservedById && wish.reservedBy
        ? new UserResponseDto(wish.reservedBy)
        : null;
  }
}
