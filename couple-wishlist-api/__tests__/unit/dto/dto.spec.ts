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

const failing = async (cls: new () => object, plain: object) =>
  (await validate(plainToInstance(cls, plain))).map((e) => e.property);

describe("DTO validation", () => {
  describe("CreateUserDto", () => {
    it("accepts a valid payload (name optional)", async () => {
      expect(
        await failing(CreateUserDto, { email: "a@b.com", password: "123456" }),
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
          password: "123456",
          name: 5,
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
});
