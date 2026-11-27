import { MigrationInterface, QueryRunner } from "typeorm";

export class WishPhotos1795300000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE wish_item ADD COLUMN "photoKey" text;
      CREATE TABLE wish_photo_cleanup (
        key text PRIMARY KEY,
        "retryAt" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "IDX_wish_photo_cleanup_retry_at" ON wish_photo_cleanup ("retryAt");

      CREATE FUNCTION enqueue_wish_photo_cleanup() RETURNS trigger
      LANGUAGE plpgsql AS $function$
      BEGIN
        IF OLD."photoKey" IS NOT NULL AND
           (TG_OP = 'DELETE' OR OLD."photoKey" IS DISTINCT FROM NEW."photoKey") THEN
          INSERT INTO wish_photo_cleanup (key) VALUES (OLD."photoKey")
          ON CONFLICT (key) DO NOTHING;
        END IF;
        RETURN NULL;
      END;
      $function$;

      CREATE TRIGGER wish_photo_cleanup_on_change
        AFTER UPDATE OF "photoKey" OR DELETE ON wish_item
        FOR EACH ROW EXECUTE FUNCTION enqueue_wish_photo_cleanup();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      LOCK TABLE wish_item, wish_photo_cleanup IN ACCESS EXCLUSIVE MODE;
      DO $block$
      BEGIN
        IF EXISTS (SELECT 1 FROM wish_item WHERE "photoKey" IS NOT NULL)
          OR EXISTS (SELECT 1 FROM wish_photo_cleanup) THEN
          RAISE EXCEPTION 'Remove attached wish photos and drain the photo cleanup queue before reverting';
        END IF;
      END;
      $block$;
      DROP TRIGGER wish_photo_cleanup_on_change ON wish_item;
      DROP FUNCTION enqueue_wish_photo_cleanup();
      DROP TABLE wish_photo_cleanup;
      ALTER TABLE wish_item DROP COLUMN "photoKey";
    `);
  }
}
