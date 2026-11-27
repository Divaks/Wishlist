import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import request from "supertest";
import { WishlistSchema1795300000000 } from "../../src/migrations/1795300000000-wishlist-schema";
import { configureApp } from "../../src/configure-app";

describe("PostgreSQL wishlist API", () => {
  const database = "wishlist_e2e_" + randomUUID().replaceAll("-", "");
  let admin: DataSource;
  let app: INestApplication;
  let created = false;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  beforeAll(async () => {
    admin = await new DataSource({
      type: "postgres",
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? "postgres",
      password: process.env.DB_PASSWORD,
      database: "postgres",
    }).initialize();
    await admin.query('CREATE DATABASE "' + database + '"');
    created = true;
    process.env.DATABASE_URL = "";
    process.env.DB_NAME = database;
    process.env.JWT_SECRET = randomUUID();
    const { AppModule } = await import("../../src/app.module");
    app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });
    configureApp(app);
    await app.init();
  }, 30000);
  afterAll(async () => {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    await app?.close();
    if (created) await admin.query('DROP DATABASE "' + database + '"');
    if (admin?.isInitialized) await admin.destroy();
  });

  const api = () => request(app.getHttpServer());
  async function account() {
    const email = randomUUID() + "@example.org";
    const credentials = { email, password: "long-passphrase" };
    const registration = await api()
      .post("/auth/register")
      .send(credentials)
      .expect(201);
    expect(registration.body.password).toBeUndefined();
    const login = await api().post("/auth/login").send(credentials).expect(201);
    return {
      email,
      id: registration.body.id as string,
      auth: { Authorization: "Bearer " + login.body.accessToken },
    };
  }
  it("preserves legacy IDs, email identities, partnerships and reservations during upgrade", async () => {
    const runner = app.get(DataSource).createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(`
        CREATE SCHEMA legacy_fixture;
        SET LOCAL search_path TO legacy_fixture;
        CREATE TABLE "user" (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar UNIQUE NOT NULL, password varchar NOT NULL, name varchar, "partnerId" uuid UNIQUE REFERENCES "user"(id));
        INSERT INTO "user"(email,password) VALUES ('Legacy@example.org','fixture'),('partner@example.org','fixture');
        UPDATE "user" a SET "partnerId"=b.id FROM "user" b WHERE a.id<>b.id;
        CREATE TABLE wish_item (id serial PRIMARY KEY,title varchar NOT NULL,"userId" uuid REFERENCES "user"(id),"reservedById" uuid REFERENCES "user"(id));
        INSERT INTO wish_item(title,"userId","reservedById") SELECT 'Keepsake',id,"partnerId" FROM "user" WHERE email='Legacy@example.org';
      `);
      await new WishlistSchema1795300000000().up(runner);
      const rows = await runner.query(
        `SELECT w.id, u.email, b.email AS reserver FROM wish_item w JOIN "user" u ON w."userId"=u.id JOIN "user" b ON w."reservedById"=b.id`,
      );
      expect(rows).toEqual([
        {
          id: "00000000-0000-4000-8000-000000000001",
          email: "legacy@example.org",
          reserver: "partner@example.org",
        },
      ]);
      const members = await runner.query(
        "SELECT role FROM group_member ORDER BY role::text",
      );
      expect(members).toEqual([{ role: "member" }, { role: "owner" }]);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
  it("validates credentials and rejects unauthenticated access", async () => {
    await api().get("/groups").expect(401);
    await api()
      .post("/auth/register")
      .send({ email: "invalid", password: "short" })
      .expect(400);
    await api()
      .post("/auth/login")
      .send({ email: "missing@example.org", password: "wrong" })
      .expect(401);
    const user = await account();
    await api()
      .post("/auth/register")
      .send({ email: user.email, password: "long-passphrase" })
      .expect(409);
    await api()
      .patch("/users/profile")
      .set(user.auth)
      .send({ birthday: "2024-02-30" })
      .expect(400);
    await api()
      .patch("/users/profile")
      .set(user.auth)
      .send({ birthday: "2000-01-02" })
      .expect(200);
    const profile = await api()
      .get("/users/profile")
      .set(user.auth)
      .expect(200);
    expect(profile.body.birthday).toBe("2000-01-02");
    await api().delete("/users/account").set(user.auth).expect(204);
    await api().get("/users/profile").set(user.auth).expect(401);
  });
  it("requires acceptance and persists exactly one concurrent reservation", async () => {
    const owner = await account(),
      a = await account(),
      b = await account();
    const group = await api()
      .post("/groups")
      .set(owner.auth)
      .send({ name: "Family" })
      .expect(201);
    const path = "/groups/" + group.body.id;
    const wish = await api()
      .post("/wishlist")
      .set(owner.auth)
      .send({ title: "Tea", isInCart: true })
      .expect(201);
    expect(wish.body.isInCart).toBe(true);
    const item = "/wishlist/" + wish.body.id;
    const legacyList = await api().get("/wishlist").set(owner.auth).expect(200);
    expect(legacyList.body.map((w: { id: string }) => w.id)).toContain(
      wish.body.id,
    );
    const paged = await api()
      .get("/wishlist/paged?page=1&limit=1")
      .set(owner.auth)
      .expect(200);
    expect(paged.body).toMatchObject({ total: 1, limit: 1, page: 1 });
    await api()
      .patch(item)
      .set(owner.auth)
      .send({ isInCart: null })
      .expect(400);
    const changed = await api()
      .patch(item)
      .set(owner.auth)
      .send({ price: 14.25 })
      .expect(200);
    expect(changed.body).toMatchObject({
      price: 14.25,
      user: { id: owner.id },
    });
    for (const member of [a, b]) {
      await api()
        .post(path + "/members")
        .set(owner.auth)
        .send({ email: member.email })
        .expect(201);
      await api()
        .get(path + "/wishes/paged")
        .set(member.auth)
        .expect(403);
      await api()
        .post(item + "/reserve")
        .set(member.auth)
        .expect(404);
      await api()
        .post(path + "/invitations/accept")
        .set(member.auth)
        .expect(204);
    }
    const reservations = await Promise.all(
      [a, b].map((m) =>
        api()
          .post(item + "/reserve")
          .set(m.auth),
      ),
    );
    expect(reservations.map((r) => r.status).sort()).toEqual([201, 409]);
    const winner = reservations[0].status === 201 ? a : b;
    const other = winner === a ? b : a;
    const list = await api()
      .get(path + "/wishes/paged")
      .set(other.auth)
      .expect(200);
    expect(list.body.data[0]).toMatchObject({
      isReserved: true,
      reservedBy: null,
      reservedById: null,
    });
    await api()
      .delete(item + "/reserve")
      .set(winner.auth)
      .expect(204);
    await api()
      .post(item + "/reserve")
      .set(other.auth)
      .expect(201);
    await api().patch(item).set(other.auth).send({ title: "x" }).expect(404);
    await api().delete(item).set(other.auth).expect(404);
    await api().delete("/users/account").set(owner.auth).expect(409);
    const transfers = await Promise.all(
      [a, b].map((m) =>
        api()
          .post(path + "/members/" + m.id + "/transfer-ownership")
          .set(owner.auth),
      ),
    );
    expect(transfers.map((r) => r.status).sort()).toEqual([204, 403]);
    await api().delete("/users/account").set(owner.auth).expect(204);
  });
});
