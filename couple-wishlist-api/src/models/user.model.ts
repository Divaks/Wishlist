import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { WishItem } from "./wish-item.model";
import { GroupMember } from "./group-member.model";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: "date", nullable: true })
  birthday: Date | null;

  @OneToMany(() => WishItem, (item) => item.user)
  wishlist: WishItem[];

  @OneToMany(() => GroupMember, (member) => member.user)
  groupMemberships: GroupMember[];
}
