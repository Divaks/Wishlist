import { MigrationInterface, QueryRunner } from "typeorm";

export class WishlistSchema1795300000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar NOT NULL UNIQUE,
        password varchar NOT NULL, name varchar
      );
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS birthday date;
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM "user" GROUP BY lower(email) HAVING count(*) > 1) THEN
          RAISE EXCEPTION 'Resolve case-insensitive email collisions before migrating';
        END IF;
      END $$;
      UPDATE "user" SET email = lower(email) WHERE email <> lower(email);
      CREATE UNIQUE INDEX IF NOT EXISTS user_email_normalized ON "user" (lower(email));
      CREATE TABLE IF NOT EXISTS "group" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar NOT NULL, description varchar,
        "createdById" uuid NOT NULL REFERENCES "user"(id), "createdAt" timestamp NOT NULL DEFAULT now()
      );
      DO $$ BEGIN CREATE TYPE group_member_role_enum AS ENUM ('owner','member');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      CREATE TABLE IF NOT EXISTS group_member (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "groupId" uuid NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
        "userId" uuid NOT NULL REFERENCES "user"(id), role group_member_role_enum NOT NULL DEFAULT 'member',
        "joinedAt" timestamp NOT NULL DEFAULT now(), UNIQUE ("groupId","userId")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS group_one_owner ON group_member ("groupId") WHERE role='owner';
      DO $$ DECLARE pair record; gid uuid;
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='user' AND column_name='partnerId') THEN
          FOR pair IN SELECT a.id AS owner, b.id AS partner FROM "user" a JOIN "user" b ON b.id=a."partnerId" AND b."partnerId"=a.id WHERE a.id < b.id LOOP
            INSERT INTO "group"(name,"createdById") VALUES ('Partners',pair.owner) RETURNING id INTO gid;
            INSERT INTO group_member ("groupId","userId",role) VALUES (gid,pair.owner,'owner'),(gid,pair.partner,'member');
          END LOOP;
          -- Retain the original mapping for reconciliation; deleted partners clear the reference.
          FOR pair IN SELECT conname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
            WHERE c.conrelid='"user"'::regclass AND c.contype='f' AND a.attname='partnerId' LOOP
            EXECUTE format('ALTER TABLE "user" DROP CONSTRAINT %I', pair.conname);
          END LOOP;
          ALTER TABLE "user" ADD FOREIGN KEY ("partnerId") REFERENCES "user"(id) ON DELETE SET NULL;
        END IF;
      END $$;
      CREATE TABLE group_invitation (
        "groupId" uuid REFERENCES "group"(id) ON DELETE CASCADE,
        "userId" uuid REFERENCES "user"(id) ON DELETE CASCADE, PRIMARY KEY ("groupId","userId")
      );
      DO $$ BEGIN CREATE TYPE wish_item_priority_enum AS ENUM ('low','medium','high');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      CREATE TABLE IF NOT EXISTS wish_item (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar NOT NULL, description varchar,
        price numeric(10,2) NOT NULL DEFAULT 0, link varchar, priority wish_item_priority_enum NOT NULL DEFAULT 'medium',
        "isInCart" boolean NOT NULL DEFAULT false, "userId" uuid REFERENCES "user"(id),
        "reservedById" uuid REFERENCES "user"(id)
      );
      ALTER TABLE wish_item ADD COLUMN IF NOT EXISTS occasion varchar,
        ADD COLUMN IF NOT EXISTS "occasionDate" date,
        ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now();
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema()
          AND table_name='wish_item' AND column_name='id' AND data_type IN ('integer','bigint')) THEN
          ALTER TABLE wish_item ALTER COLUMN id DROP DEFAULT;
          ALTER TABLE wish_item ALTER COLUMN id TYPE uuid USING
            ('00000000-0000-4000-8000-' || lpad(to_hex(id),12,'0'))::uuid;
          ALTER TABLE wish_item ALTER COLUMN id SET DEFAULT gen_random_uuid();
        END IF;
      END $$;
    `);
  }

  down(): Promise<void> {
    throw new Error(
      "Restore the pre-migration backup to recover the legacy schema",
    );
  }
}
