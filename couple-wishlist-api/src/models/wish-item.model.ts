import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.model";

export enum Priority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

@Entity()
export class WishItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ nullable: true })
  link: string;

  @Column({ type: "enum", enum: Priority, default: Priority.MEDIUM })
  priority: Priority;

  @Column({ default: false })
  isInCart: boolean;

  @Column({ nullable: true })
  occasion: string;

  @Column({ type: "date", nullable: true })
  occasionDate: Date | null;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, (user) => user.wishlist)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ nullable: true })
  reservedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "reservedById" })
  reservedBy: User | null;
}
