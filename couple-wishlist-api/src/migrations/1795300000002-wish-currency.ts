import { MigrationInterface, QueryRunner } from "typeorm";

export class WishCurrency1795300000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE wish_currency AS ENUM ('UAH', 'EUR', 'USD');
      ALTER TABLE wish_item ADD COLUMN currency wish_currency NOT NULL DEFAULT 'UAH';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE wish_item DROP COLUMN currency;
      DROP TYPE wish_currency;
    `);
  }
}
