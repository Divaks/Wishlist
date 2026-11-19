import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { WishItem } from './wish-item.model';
import { GroupMember } from './group-member.model';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ unique: true, nullable: true })
  inviteCode: string;

  @Column({ type: 'varchar', nullable: true })
  partnerId: string | null;

  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'partnerid' })
  partner: User | null;

  @OneToMany(() => WishItem, (item) => item.user)
  wishlist: WishItem[];

  @OneToMany(() => GroupMember, (member) => member.user)
  groupMemberships: GroupMember[];
}
