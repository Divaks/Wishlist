import { Expose, Exclude } from "class-transformer";
import { User } from "../../models/user.model";

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string | null;

  @Expose()
  birthday: Date | null;

  @Exclude()
  email: string;

  @Exclude()
  password: string;

  @Exclude()
  groupMemberships: any;

  @Exclude()
  wishlist: any;

  constructor(user: User) {
    this.id = user.id;
    this.name = user.name;
    this.birthday = user.birthday;
  }
}
