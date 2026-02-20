import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { WishItem } from './wish-item.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'uuid', nullable: true })
  partnerId: string | null;

  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'partnerid' })
  partner: User | null;

  @OneToMany(() => WishItem, (item) => item.user)
  wishlist: WishItem[];
}
