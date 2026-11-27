import { WishCurrency1795300000002 } from "../../src/migrations/1795300000002-wish-currency";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import request from "supertest";
import { WishlistSchema1795300000000 } from "../../src/migrations/1795300000000-wishlist-schema";
import { WishPhotos1795300000001 } from "../../src/migrations/1795300000001-wish-photos";
import { WishPhotoStorage } from "../../src/services/wish-photo-storage.service";
import { WishPhotosService } from "../../src/services/wish-photos.service";
import { WishPhotoCleanup } from "../../src/models/wish-photo-cleanup.model";
import { MAX_WISH_PHOTO_BYTES } from "../../src/wish-photo-upload";
import { configureApp } from "../../src/configure-app";

describe("PostgreSQL wishlist API", () => {
  const database = "wishlist_e2e_" + randomUUID().replaceAll("-", "");
  let admin: DataSource;
  let app: INestApplication;
  let created = false;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const objects = new Set<string>();
  const photoStorage = {
    enabled: false,
    put: jest.fn((key: string, _bytes: Buffer, _mime: string) => {
      objects.add(key);
      return Promise.resolve();
    }),
    delete: jest.fn((key: string) => {
      objects.delete(key);
      return Promise.resolve();
    }),
    url: jest.fn((key: string) =>
      Promise.resolve(`https://photos.example.org/${key}?signed=1`),
    ),
  };
  let png: Buffer;
  let jpeg: Buffer;
  let webp: Buffer;
  const photoHeaders = { filename: "file.jpg", contentType: "image/jpeg" };

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
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(WishPhotoStorage)
      .useValue(photoStorage)
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    photoStorage.enabled = true;
    const pixels = sharp({
      create: { width: 2, height: 2, channels: 3, background: "#ffcd77" },
    });
    [png, jpeg, webp] = await Promise.all([
      pixels.clone().png().toBuffer(),
      pixels.clone().jpeg().toBuffer(),
      pixels.clone().webp().toBuffer(),
    ]);
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
      const photos = new WishPhotos1795300000001();
      await photos.up(runner);
      expect(await runner.query('SELECT "photoKey" FROM wish_item')).toEqual([
        { photoKey: null },
      ]);
      const currencies = new WishCurrency1795300000002();
      await currencies.up(runner);
      expect(await runner.query("SELECT currency FROM wish_item")).toEqual([
        { currency: "UAH" },
      ]);
      await currencies.down(runner);
      await photos.down(runner);
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
    expect(wish.body.currency).toBe("UAH");
    expect(wish.body.photoUrl).toBeNull();
    await api()
      .put("/wishlist/" + wish.body.id + "/photo")
      .set(owner.auth)
      .attach("photo", png, photoHeaders)
      .expect(204);
    const item = "/wishlist/" + wish.body.id;
    const photoUrl = (await api().get(item).set(owner.auth).expect(200)).body
      .photoUrl;
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
    await api()
      .patch(item)
      .set(owner.auth)
      .send({ currency: "GBP" })
      .expect(400);
    const changed = await api()
      .patch(item)
      .set(owner.auth)
      .send({ price: 14.25, currency: "EUR" })
      .expect(200);
    expect(changed.body).toMatchObject({
      price: 14.25,
      currency: "EUR",
      user: { id: owner.id },
    });
    for (const member of [a, b]) {
      await api()
        .post(path + "/members")
        .set(owner.auth)
        .send({ email: member.email })
        .expect(201);
      const signedBefore = photoStorage.url.mock.calls.length;
      await api()
        .get(path + "/wishes/paged")
        .set(member.auth)
        .expect(403);
      await api()
        .post(item + "/reserve")
        .set(member.auth)
        .expect(404);
      expect(photoStorage.url).toHaveBeenCalledTimes(signedBefore);
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
    const memberWishes = await api()
      .get(path + "/wishes/" + owner.id)
      .set(other.auth)
      .expect(200);
    expect(memberWishes.body.data[0].photoUrl).toBe(photoUrl);
    expect(list.body.data[0]).toMatchObject({
      photoUrl,
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
    await api()
      .delete(path + "/members/" + other.id)
      .set(owner.auth)
      .expect(204);
    const signedBeforeRemoval = photoStorage.url.mock.calls.length;
    await api()
      .get(path + "/wishes")
      .set(other.auth)
      .expect(403);
    await api()
      .get(path + "/wishes/" + owner.id)
      .set(other.auth)
      .expect(403);
    expect(photoStorage.url).toHaveBeenCalledTimes(signedBeforeRemoval);
    const transfers = await Promise.all(
      [winner, other].map((m) =>
        api()
          .post(path + "/members/" + m.id + "/transfer-ownership")
          .set(owner.auth),
      ),
    );
    expect(transfers.map((r) => r.status).sort()).toEqual([204, 403]);
    const accountPhoto = photoStorage.put.mock.calls.at(-1)![0];
    await api().delete("/users/account").set(owner.auth).expect(204);
    expect(objects.has(accountPhoto)).toBe(true);
    await app.get(WishPhotosService).cleanUp();
    expect(objects.has(accountPhoto)).toBe(false);
  });

  it("validates owner-only uploads and keeps the original on failed replacement", async () => {
    const owner = await account(),
      other = await account();
    const created = await api()
      .post("/wishlist")
      .set(owner.auth)
      .send({ title: "Camera", link: "https://shop.example/camera" })
      .expect(201);
    const item = "/wishlist/" + created.body.id;
    const photoPath = item + "/photo";
    const upload = (file: Buffer) =>
      api().put(photoPath).set(owner.auth).attach("photo", file, photoHeaders);
    const current = async () =>
      (await api().get(item).set(owner.auth).expect(200)).body;

    expect(created.body.photoUrl).toBeNull();
    await api().put(photoPath).attach("photo", png, photoHeaders).expect(401);
    await api()
      .put(photoPath)
      .set(other.auth)
      .attach("photo", png, photoHeaders)
      .expect(404);
    await api().delete(photoPath).set(other.auth).expect(404);
    await api().put(photoPath).set(owner.auth).send({}).expect(400);
    await api()
      .put(photoPath)
      .set(owner.auth)
      .attach("other", png, photoHeaders)
      .expect(400);
    await upload(png).attach("photo", png, photoHeaders).expect(400);
    await upload(Buffer.from("plain text")).expect(400);
    await upload(png.subarray(0, 32)).expect(400);
    await upload(Buffer.alloc(MAX_WISH_PHOTO_BYTES)).expect(400);
    await upload(Buffer.alloc(MAX_WISH_PHOTO_BYTES + 1)).expect(413);
    const boundary = "photo-test";
    const oversizedPreamble = Buffer.concat([
      Buffer.alloc(MAX_WISH_PHOTO_BYTES + 64 * 1024, 32),
      Buffer.from(`
--${boundary}
Content-Disposition: form-data; name="photo"; filename="p.png"
Content-Type: image/png

`),
      png,
      Buffer.from(`
--${boundary}--
`),
    ]);
    await api()
      .put(photoPath)
      .set(owner.auth)
      .set("Content-Type", `multipart/form-data; boundary=${boundary}`)
      .send(oversizedPreamble)
      .expect(413);

    await upload(png).expect(204);
    const initial = await current();
    expect(initial).toMatchObject({
      link: "https://shop.example/camera",
      photoUrl: expect.any(String),
    });
    expect(initial).not.toHaveProperty("photoKey");
    const initialKey = photoStorage.put.mock.calls.at(-1)![0];
    expect(photoStorage.put).toHaveBeenLastCalledWith(
      initialKey,
      png,
      "image/png",
    );

    photoStorage.put.mockImplementationOnce((key) => {
      objects.add(key);
      return Promise.reject(new Error("S3 response lost"));
    });
    await upload(jpeg).expect(503);
    const ambiguousKey = photoStorage.put.mock.calls.at(-1)![0];
    expect((await current()).photoUrl).toBe(initial.photoUrl);
    expect(objects.has(initialKey)).toBe(true);

    await upload(jpeg).expect(204);
    const replacement = await current();
    const replacementKey = photoStorage.put.mock.calls.at(-1)![0];
    expect(replacement.photoUrl).not.toBe(initial.photoUrl);
    expect(objects.has(initialKey)).toBe(true);
    photoStorage.delete.mockRejectedValueOnce(new Error("S3 unavailable"));
    const cleanups = app.get(DataSource).getRepository(WishPhotoCleanup);
    await app.get(WishPhotosService).cleanUp();
    expect(await cleanups.existsBy({ key: initialKey })).toBe(true);
    expect(objects.has(initialKey)).toBe(true);
    await cleanups.update(initialKey, { retryAt: new Date(0) });
    await app.get(WishPhotosService).cleanUp();
    expect(objects.has(initialKey)).toBe(false);
    expect(objects.has(replacementKey)).toBe(true);
    expect(objects.has(ambiguousKey)).toBe(true);
    await cleanups.update(ambiguousKey, { retryAt: new Date(0) });
    await app.get(WishPhotosService).cleanUp();
    expect(objects.has(ambiguousKey)).toBe(false);

    await api().delete(photoPath).set(owner.auth).expect(204);
    await api().delete(photoPath).set(owner.auth).expect(204);
    expect((await current()).photoUrl).toBeNull();
    await app.get(WishPhotosService).cleanUp();
    expect(objects.has(replacementKey)).toBe(false);
  });

  it("cleans attachments lost to concurrent updates and wish deletion", async () => {
    const owner = await account();
    const created = await api()
      .post("/wishlist")
      .set(owner.auth)
      .send({ title: "Race" })
      .expect(201);
    const item = "/wishlist/" + created.body.id;
    const upload = (file: Buffer) =>
      api()
        .put(item + "/photo")
        .set(owner.auth)
        .attach("photo", file, photoHeaders);
    const before = photoStorage.put.mock.calls.length;
    await Promise.all([upload(png).expect(204), upload(webp).expect(204)]);
    const keys = photoStorage.put.mock.calls.slice(before).map(([key]) => key);
    expect(
      photoStorage.put.mock.calls.slice(before).map(([, , mime]) => mime),
    ).toContain("image/webp");
    await app.get(WishPhotosService).cleanUp();
    expect(keys.filter((key) => objects.has(key))).toHaveLength(1);
    const visible = await api().get(item).set(owner.auth).expect(200);
    expect(visible.body.photoUrl).toContain(
      keys.find((key) => objects.has(key)),
    );

    photoStorage.put.mockImplementationOnce(async (key) => {
      objects.add(key);
      await api().delete(item).set(owner.auth).expect(204);
    });
    await upload(jpeg).expect(404);
    const orphanKey = photoStorage.put.mock.calls.at(-1)![0];
    expect(objects.has(orphanKey)).toBe(true);
    await app.get(WishPhotosService).cleanUp();
    expect([...keys, orphanKey].some((key) => objects.has(key))).toBe(false);
  });
});
