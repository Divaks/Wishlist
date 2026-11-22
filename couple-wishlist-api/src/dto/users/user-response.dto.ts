import { Expose } from "class-transformer";
import { User } from "../../models/user.model";

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string | null;

  @Expose()
  birthday: string | null;

  constructor(user: User) {
    this.id = user.id;
    this.name = user.name;
    this.birthday = user.birthday;
  }
}
