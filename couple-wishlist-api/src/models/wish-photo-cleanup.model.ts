import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity()
export class WishPhotoCleanup {
  @PrimaryColumn("text")
  key: string;

  @Index("IDX_wish_photo_cleanup_retry_at")
  @Column("timestamptz", { default: () => "now()" })
  retryAt: Date;
}
