import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QueryFailedError } from "typeorm";
import request from "supertest";
import { App } from "supertest/types";
import { AuthController } from "../../src/controllers/auth.controller";
import { UsersController } from "../../src/controllers/users.controller";
import { WishlistController } from "../../src/controllers/wishlist.controller";
import { AuthService } from "../../src/services/auth.service";
import { UsersService } from "../../src/services/users.service";
import { WishlistService } from "../../src/services/wishlist.service";
import { JwtStrategy } from "../../src/strategies/jwt.strategy";
import { User } from "../../src/models/user.model";
import { WishItem } from "../../src/models/wish-item.model";

/**
 * HTTP-level tests: real controllers, services, guard, JWT strategy and
 * ValidationPipe; only the TypeORM repositories are replaced by in-memory fakes,
 * so no database is needed.
 */
describe("Wishlist API (e2e, in-memory repositories)", () => {
  let app: INestApplication<App>;
  let users: any[];
  let wishes: any[];

  beforeEach(async () => {
    users = [];
    wishes = [];
    let seq = 0;

    const userRepo = {
      create: (x: object) => ({ id: `u${++seq}`, ...x }),
      save: (x: any) => {
        if (users.some((u) => u.email === x.email)) {
          return Promise.reject(
            new QueryFailedError("INSERT", [], { code: "23505" } as any),
          );
        }
        users.push(x);
        return Promise.resolve(x);
      },
      findOne: ({ where }: any) =>
        Promise.resolve(
          users.find((u) =>
            Object.entries(where).every(([k, v]) => u[k] === v),
          ) ?? null,
        ),
      update: (id: string, patch: object) => {
        Object.assign(
          users.find((u) => u.id === id),
          patch,
        );
        return Promise.resolve();
      },
      find: () => Promise.resolve(users),
    };
    const wishRepo = {
      create: (x: object) => ({ id: `w${++seq}`, ...x }),
      save: (x: any) => {
        if (!wishes.includes(x)) wishes.push(x);
        return Promise.resolve(x);
      },
      find: ({ where }: any) =>
        Promise.resolve(wishes.filter((w) => w.userId === where.userId)),
      findOne: ({ where }: any) =>
        Promise.resolve(
          wishes.find((w) =>
            Object.entries(where).every(([k, v]) => w[k] === v),
          ) ?? null,
        ),
      remove: (x: any) => {
        wishes = wishes.filter((w) => w !== x);
        return Promise.resolve(x);
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET: "e2e-secret" })],
        }),
        PassportModule,
        JwtModule.register({
          secret: "e2e-secret",
          signOptions: { expiresIn: "1d" },
        }),
      ],
      controllers: [AuthController, UsersController, WishlistController],
      providers: [
        AuthService,
        UsersService,
        WishlistService,
        JwtStrategy,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(WishItem), useValue: wishRepo },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(() => app.close());

  const register = (email: string, password = "secret1") =>
    request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password, name: email.split("@")[0] });

  const login = async (email: string, password = "secret1") => {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password });
    return res.body.accessToken as string;
  };

  const signedIn = async (email: string) => {
    await register(email).expect(201);
    return login(email);
  };

  describe("auth", () => {
    it("registers, stores a bcrypt hash and logs in", async () => {
      const reg = await register("ann@x.com").expect(201);
      expect(reg.body).toEqual({
        id: expect.any(String),
        email: "ann@x.com",
        name: "ann",
      });
      expect(users[0].password).not.toBe("secret1");
      expect(users[0].name).toBe("ann");

      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "ann@x.com", password: "secret1" })
        .expect(201);
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it("returns 409 when the email is already registered", async () => {
      await register("ann@x.com").expect(201);
      await register("ann@x.com").expect(409);
    });

    it("rejects a wrong password with 401", async () => {
      await register("ann@x.com");
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "ann@x.com", password: "wrong-pass" })
        .expect(401);
    });

    it("rejects an unknown user with 401", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "ghost@x.com", password: "secret1" })
        .expect(401);
    });

    it("validates the register payload (400)", async () => {
      await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email: "not-an-email", password: "123" })
        .expect(400);
    });

    it("validates the login payload (400)", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({})
        .expect(400);
    });
  });

  describe("protected routes", () => {
    it.each([
      ["get", "/users/profile"],
      ["post", "/users/generate-code"],
      ["get", "/wishlist"],
      ["post", "/wishlist"],
    ])("%s %s returns 401 without a token", async (method, url) => {
      await (request(app.getHttpServer()) as any)[method](url).expect(401);
    });

    it("returns 401 for a garbage token", async () => {
      await request(app.getHttpServer())
        .get("/users/profile")
        .set("Authorization", "Bearer not.a.jwt")
        .expect(401);
    });
  });

  describe("users", () => {
    it("returns the profile from the token", async () => {
      const token = await signedIn("ann@x.com");
      const res = await request(app.getHttpServer())
        .get("/users/profile")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body).toMatchObject({ email: "ann@x.com" });
    });

    it("connects two users through an invite code", async () => {
      const annToken = await signedIn("ann@x.com");
      const bobToken = await signedIn("bob@x.com");

      const { body } = await request(app.getHttpServer())
        .post("/users/generate-code")
        .set("Authorization", `Bearer ${annToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post("/users/connect")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ code: body.inviteCode })
        .expect(201);

      expect(users[0].partnerId).toBe(users[1].id);
      expect(users[1].partnerId).toBe(users[0].id);
    });

    it("returns 404 for an invalid code and 400 for your own code", async () => {
      const token = await signedIn("ann@x.com");
      await request(app.getHttpServer())
        .post("/users/connect")
        .set("Authorization", `Bearer ${token}`)
        .send({ code: "NOPE" })
        .expect(404);

      const { body } = await request(app.getHttpServer())
        .post("/users/generate-code")
        .set("Authorization", `Bearer ${token}`);
      await request(app.getHttpServer())
        .post("/users/connect")
        .set("Authorization", `Bearer ${token}`)
        .send({ code: body.inviteCode })
        .expect(400);
    });
  });

  describe("wishlist", () => {
    it("creates, lists, updates and deletes own wishes", async () => {
      const token = await signedIn("ann@x.com");
      const auth = { Authorization: `Bearer ${token}` };

      const created = await request(app.getHttpServer())
        .post("/wishlist")
        .set(auth)
        .send({ title: "Camera", price: 250, link: "https://x.com/c" })
        .expect(201);
      expect(created.body).toMatchObject({
        title: "Camera",
        link: "https://x.com/c",
        userId: users[0].id,
      });

      const list = await request(app.getHttpServer())
        .get("/wishlist")
        .set(auth)
        .expect(200);
      expect(list.body).toHaveLength(1);

      const updated = await request(app.getHttpServer())
        .patch(`/wishlist/${created.body.id}`)
        .set(auth)
        .send({ title: "Better camera" })
        .expect(200);
      expect(updated.body.title).toBe("Better camera");

      await request(app.getHttpServer())
        .delete(`/wishlist/${created.body.id}`)
        .set(auth)
        .expect(200);
      expect(wishes).toHaveLength(0);
    });

    it("validates the create payload (400)", async () => {
      const token = await signedIn("ann@x.com");
      await request(app.getHttpServer())
        .post("/wishlist")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "", price: "free" })
        .expect(400);
    });

    it("404s when touching someone else's wish", async () => {
      const annToken = await signedIn("ann@x.com");
      const bobToken = await signedIn("bob@x.com");
      const { body } = await request(app.getHttpServer())
        .post("/wishlist")
        .set("Authorization", `Bearer ${annToken}`)
        .send({ title: "Secret" });

      await request(app.getHttpServer())
        .delete(`/wishlist/${body.id}`)
        .set("Authorization", `Bearer ${bobToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .patch(`/wishlist/${body.id}`)
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ title: "hacked" })
        .expect(404);
    });

    it("lets a partner view and reserve a wish, but not their own", async () => {
      const annToken = await signedIn("ann@x.com");
      const bobToken = await signedIn("bob@x.com");
      const ann = { Authorization: `Bearer ${annToken}` };
      const bob = { Authorization: `Bearer ${bobToken}` };

      const wish = (
        await request(app.getHttpServer())
          .post("/wishlist")
          .set(ann)
          .send({ title: "Ring" })
      ).body;

      // Not connected yet -> 400
      await request(app.getHttpServer())
        .get("/wishlist/partner")
        .set(bob)
        .expect(400);

      const { body } = await request(app.getHttpServer())
        .post("/users/generate-code")
        .set(ann);
      await request(app.getHttpServer())
        .post("/users/connect")
        .set(bob)
        .send({ code: body.inviteCode });

      const partnerList = await request(app.getHttpServer())
        .get("/wishlist/partner")
        .set(bob)
        .expect(200);
      expect(partnerList.body).toHaveLength(1);

      await request(app.getHttpServer())
        .post(`/wishlist/${wish.id}/reserve`)
        .set(ann)
        .expect(400); // own wish

      const reserved = await request(app.getHttpServer())
        .post(`/wishlist/${wish.id}/reserve`)
        .set(bob)
        .expect(201);
      expect(reserved.body.reservedById).toBe(users[1].id);

      await request(app.getHttpServer())
        .delete(`/wishlist/${wish.id}/reserve`)
        .set(ann)
        .expect(400); // not the reserver

      await request(app.getHttpServer())
        .delete(`/wishlist/${wish.id}/reserve`)
        .set(bob)
        .expect(204);
    });
  });
});
