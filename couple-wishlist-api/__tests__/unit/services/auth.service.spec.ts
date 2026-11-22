import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "../../../src/services/auth.service";
import { UsersService } from "../../../src/services/users.service";

jest.mock("bcrypt");

describe("AuthService", () => {
  let service: AuthService;
  const usersService = {
    findOneByEmailWithPassword: jest.fn(),
    create: jest.fn(),
  };
  const jwtService = { sign: jest.fn() };
  const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  describe("login", () => {
    const user = {
      id: "u1",
      email: "a@b.com",
      password: "hash",
    };

    it("returns a signed token containing sub and email", async () => {
      usersService.findOneByEmailWithPassword.mockResolvedValue(user);
      (bcryptMock.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue("jwt");

      await expect(service.login("a@b.com", "secret")).resolves.toEqual({
        accessToken: "jwt",
      });
      expect(bcryptMock.compare).toHaveBeenCalledWith("secret", "hash");
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: "u1",
        email: "a@b.com",
      });
    });

    it("rejects an unknown email", async () => {
      usersService.findOneByEmailWithPassword.mockResolvedValue(null);
      await expect(service.login("x@y.com", "pw")).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcryptMock.compare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it("rejects a wrong password with the same generic message", async () => {
      usersService.findOneByEmailWithPassword.mockResolvedValue(user);
      (bcryptMock.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login("a@b.com", "wrong")).rejects.toThrow(
        "Invalid email or password",
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe("register", () => {
    it("hashes the password (10 rounds) before creating the user", async () => {
      (bcryptMock.hash as jest.Mock).mockResolvedValue("hashed");
      usersService.create.mockResolvedValue({
        id: "u1",
        email: "a@b.com",
        name: "Ann",
        password: "hashed",
      });

      const result = await service.register({
        email: "a@b.com",
        password: "plain-pass",
        name: "Ann",
      });

      expect(bcryptMock.hash).toHaveBeenCalledWith("plain-pass", 10);
      expect(usersService.create).toHaveBeenCalledWith({
        email: "a@b.com",
        password: "hashed",
        name: "Ann",
      });
      expect(result).toEqual({ id: "u1", email: "a@b.com", name: "Ann" });
      expect(result).not.toHaveProperty("password");
    });

    it("propagates errors from the users service (e.g. duplicate email)", async () => {
      (bcryptMock.hash as jest.Mock).mockResolvedValue("hashed");
      usersService.create.mockRejectedValue(new Error("duplicate key"));
      await expect(
        service.register({ email: "a@b.com", password: "secret1" }),
      ).rejects.toThrow("duplicate key");
    });
  });
});
