import { Expose, Exclude, Type } from "class-transformer";
import { WishItem } from "../../models/wish-item.model";
import { User } from "../../models/user.model";
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
  link: string | null;

  @Expose()
  priority: string;

  @Expose()
  isInCart: boolean;

  @Expose()
  occasion: string | null;

  @Expose()
  occasionDate: Date | null;

  @Expose()
  userId: string;

  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;

  @Expose()
  reservedById: string | null;

  @Expose()
  @Type(() => UserResponseDto)
  reservedBy: UserResponseDto | null;

  constructor(wish: WishItem, viewerId?: string) {
    this.id = wish.id;
    this.title = wish.title;
    this.description = wish.description;
    this.price = wish.price;
    this.link = wish.link;
    this.priority = wish.priority;
    this.isInCart = wish.isInCart;
    this.occasion = wish.occasion;
    this.occasionDate = wish.occasionDate;
    this.userId = wish.userId;
    this.user = wish.user
      ? new UserResponseDto(wish.user)
      : new UserResponseDto({
          id: "",
          name: "",
          birthday: null,
          email: "",
          password: "",
          groupMemberships: [],
          wishlist: [],
        } as User);

    // Hide reservation from the wish owner (surprise!)
    if (viewerId && wish.userId === viewerId) {
      this.reservedById = null;
      this.reservedBy = null;
    } else {
      this.reservedById = wish.reservedById;
      this.reservedBy = wish.reservedBy
        ? new UserResponseDto(wish.reservedBy)
        : null;
    }
  }
}
