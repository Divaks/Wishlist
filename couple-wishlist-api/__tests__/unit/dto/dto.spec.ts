import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateUserDto } from "../../../src/dto/users/create-user.dto";
import { LoginDto } from "../../../src/dto/auth/login.dto";
import { CreateWishlistDto } from "../../../src/dto/wishlist/create-wishlist.dto";
import { UpdateWishlistDto } from "../../../src/dto/wishlist/update-wishlist.dto";
import { CreateGroupDto } from "../../../src/dto/groups/create-group.dto";
import { UpdateGroupDto } from "../../../src/dto/groups/update-group.dto";
import { InviteMemberDto } from "../../../src/dto/groups/invite-member.dto";
import { UpdateUserDto } from "../../../src/dto/users/update-user.dto";
import { PaginationDto } from "../../../src/dto/common/pagination.dto";
import { WishResponseDto } from "../../../src/dto/wishlist/wish-response.dto";
import { WishItem } from "../../../src/models/wish-item.model";

const failing = async (cls: new () => object, plain: object) =>
  (await validate(plainToInstance(cls, plain))).map((e) => e.property);

describe("DTO validation", () => {
  describe("CreateUserDto", () => {
    it("accepts a valid payload (name optional)", async () => {
      expect(
        await failing(CreateUserDto, {
          email: "a@b.com",
          password: "password123",
        }),
      ).toEqual([]);
    });
    it("rejects bad email and short password", async () => {
      expect(
        (
          await failing(CreateUserDto, { email: "nope", password: "123" })
        ).sort(),
      ).toEqual(["email", "password"]);
    });
    it("rejects a non-string name", async () => {
      expect(
        await failing(CreateUserDto, {
          email: "a@b.com",
          password: "password123",
          name: 5,
        }),
      ).toEqual(["name"]);
    });
    it("rejects password too short (min 8)", async () => {
      expect(
        await failing(CreateUserDto, { email: "a@b.com", password: "short" }),
      ).toEqual(["password"]);
    });
    it("rejects password too long (max 72)", async () => {
      const longPass = "a".repeat(73);
      expect(
        await failing(CreateUserDto, { email: "a@b.com", password: longPass }),
      ).toEqual(["password"]);
    });
    it("rejects name too long (max 100)", async () => {
      const longName = "a".repeat(101);
      expect(
        await failing(CreateUserDto, {
          email: "a@b.com",
          password: "password123",
          name: longName,
        }),
      ).toEqual(["name"]);
    });
  });

  describe("LoginDto", () => {
    it("accepts valid credentials", async () => {
      expect(
        await failing(LoginDto, { email: "a@b.com", password: "x" }),
      ).toEqual([]);
    });
    it("rejects missing fields", async () => {
      expect((await failing(LoginDto, {})).sort()).toEqual([
        "email",
        "password",
      ]);
    });
    it("rejects an invalid email with a friendly message", async () => {
      const errors = await validate(
        plainToInstance(LoginDto, { email: "bad", password: "x" }),
      );
      expect(JSON.stringify(errors)).toContain(
        "Please enter a valid email address",
      );
    });
  });

  describe("CreateWishlistDto", () => {
    it("accepts title only", async () => {
      expect(await failing(CreateWishlistDto, { title: "Book" })).toEqual([]);
    });
    it("accepts all optional fields", async () => {
      expect(
        await failing(CreateWishlistDto, {
          title: "Book",
          description: "d",
          price: 9.99,
          link: "https://example.com/x",
          priority: "high",
          isInCart: true,
        }),
      ).toEqual([]);
    });
    it("rejects empty title, string price and malformed url", async () => {
      expect(
        (
          await failing(CreateWishlistDto, {
            title: "",
            price: "free",
            link: "not a url",
          })
        ).sort(),
      ).toEqual(["link", "price", "title"]);
    });
    it("rejects invalid priority value", async () => {
      expect(
        await failing(CreateWishlistDto, {
          title: "Book",
          priority: "invalid",
        }),
      ).toEqual(["priority"]);
    });
    it("rejects non-boolean isInCart", async () => {
      expect(
        await failing(CreateWishlistDto, {
          title: "Book",
          isInCart: "yes",
        }),
      ).toEqual(["isInCart"]);
    });
  });

  describe("UpdateWishlistDto", () => {
    it("accepts an empty payload (all optional)", async () => {
      expect(await failing(UpdateWishlistDto, {})).toEqual([]);
    });
    it("rejects invalid types", async () => {
      expect(
        (await failing(UpdateWishlistDto, { price: "x", link: "bad" })).sort(),
      ).toEqual(["link", "price"]);
    });
    it("accepts optional priority and isInCart", async () => {
      expect(
        await failing(UpdateWishlistDto, {
          priority: "low",
          isInCart: false,
        }),
      ).toEqual([]);
    });
  });

  describe("CreateGroupDto", () => {
    it("accepts a name", async () => {
      expect(await failing(CreateGroupDto, { name: "Trip" })).toEqual([]);
    });
    it("rejects missing/empty name", async () => {
      expect(await failing(CreateGroupDto, {})).toEqual(["name"]);
      expect(await failing(CreateGroupDto, { name: "" })).toEqual(["name"]);
    });
    it("rejects a non-string description", async () => {
      expect(
        await failing(CreateGroupDto, { name: "x", description: 1 }),
      ).toEqual(["description"]);
    });
  });

  describe("UpdateGroupDto", () => {
    it("accepts an empty payload", async () => {
      expect(await failing(UpdateGroupDto, {})).toEqual([]);
    });
    it("rejects non-string values", async () => {
      expect(
        (await failing(UpdateGroupDto, { name: 1, description: 2 })).sort(),
      ).toEqual(["description", "name"]);
    });
  });

  describe("InviteMemberDto", () => {
    it("accepts an email", async () => {
      expect(await failing(InviteMemberDto, { email: "a@b.com" })).toEqual([]);
    });
    it("rejects a bad email", async () => {
      expect(await failing(InviteMemberDto, { email: "nope" })).toEqual([
        "email",
      ]);
    });
  });

  describe("UpdateUserDto", () => {
    it("accepts an empty payload (all optional)", async () => {
      expect(await failing(UpdateUserDto, {})).toEqual([]);
    });
    it("accepts name and birthday", async () => {
      expect(
        await failing(UpdateUserDto, {
          name: "New Name",
          birthday: "1990-01-01",
        }),
      ).toEqual([]);
    });
    it("rejects non-string name", async () => {
      expect(await failing(UpdateUserDto, { name: 123 })).toEqual(["name"]);
    });
    it("rejects name too long (max 100)", async () => {
      const longName = "a".repeat(101);
      expect(await failing(UpdateUserDto, { name: longName })).toEqual([
        "name",
      ]);
    });
    it("rejects invalid date format for birthday", async () => {
      expect(await failing(UpdateUserDto, { birthday: "not-a-date" })).toEqual([
        "birthday",
      ]);
    });
  });

  describe("PaginationDto", () => {
    it("accepts default values when not provided", () => {
      const dto = plainToInstance(PaginationDto, {});
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
    });
    it("accepts custom page and limit", () => {
      const dto = plainToInstance(PaginationDto, { page: 3, limit: 50 });
      expect(dto.page).toBe(3);
      expect(dto.limit).toBe(50);
    });
    it("rejects page < 1", async () => {
      expect((await failing(PaginationDto, { page: 0 })).sort()).toEqual([
        "page",
      ]);
    });
    it("rejects limit < 1", async () => {
      expect((await failing(PaginationDto, { limit: 0 })).sort()).toEqual([
        "limit",
      ]);
    });
    it("rejects limit > 100", async () => {
      expect((await failing(PaginationDto, { limit: 101 })).sort()).toEqual([
        "limit",
      ]);
    });
  });

  describe("WishResponseDto", () => {
    it("creates response with all fields when wish has user and reservedBy", () => {
      const wish = {
        id: "1",
        title: "Test",
        description: "desc",
        price: 10,
        link: "https://example.com",
        priority: "high",
        isInCart: true,
        occasion: "birthday",
        occasionDate: new Date("2024-01-01"),
        userId: "u1",
        user: { id: "u1", name: "User", birthday: null },
        reservedById: "u2",
        reservedBy: { id: "u2", name: "Reserver", birthday: null },
      } as unknown as WishItem;

      const response = new WishResponseDto(wish, "u3");

      expect(response.id).toBe("1");
      expect(response.title).toBe("Test");
      expect(response.user).toBeDefined();
      expect(response.reservedBy).toBeDefined();
      expect(response.reservedById).toBe("u2");
    });

    it("hides reservation from wish owner", () => {
      const wish = {
        id: "1",
        title: "Test",
        description: "desc",
        price: 10,
        link: "https://example.com",
        priority: "high",
        isInCart: true,
        occasion: "birthday",
        occasionDate: new Date("2024-01-01"),
        userId: "u1",
        user: { id: "u1", name: "User", birthday: null },
        reservedById: "u2",
        reservedBy: { id: "u2", name: "Reserver", birthday: null },
      } as unknown as WishItem;

      const response = new WishResponseDto(wish, "u1");

      expect(response.reservedById).toBeNull();
      expect(response.reservedBy).toBeNull();
    });

    it("shows reservation to non-owner", () => {
      const wish = {
        id: "1",
        title: "Test",
        description: "desc",
        price: 10,
        link: "https://example.com",
        priority: "high",
        isInCart: true,
        occasion: "birthday",
        occasionDate: new Date("2024-01-01"),
        userId: "u1",
        user: { id: "u1", name: "User", birthday: null },
        reservedById: "u2",
        reservedBy: { id: "u2", name: "Reserver", birthday: null },
      } as unknown as WishItem;

      const response = new WishResponseDto(wish, "u3");

      expect(response.reservedById).toBe("u2");
      expect(response.reservedBy).toBeDefined();
    });

    it("handles wish without user", () => {
      const wish = {
        id: "1",
        title: "Test",
        description: null,
        price: 0,
        link: null,
        priority: "medium",
        isInCart: false,
        occasion: null,
        occasionDate: null,
        userId: "u1",
        user: null,
        reservedById: null,
        reservedBy: null,
      } as unknown as WishItem;

      const response = new WishResponseDto(wish, "u1");

      expect(response.user).toBeDefined();
      expect(response.user.id).toBe("");
    });
  });
});
