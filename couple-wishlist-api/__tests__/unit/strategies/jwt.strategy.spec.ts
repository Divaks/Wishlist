import { UsersService } from "../../../src/services/users.service";
import { ConfigService } from "@nestjs/config";
import { JwtStrategy } from "../../../src/strategies/jwt.strategy";

describe("JwtStrategy", () => {
  const config = (secret?: string) =>
    ({ get: jest.fn().mockReturnValue(secret) }) as unknown as ConfigService;

  const users = { findOne: jest.fn() } as unknown as UsersService;
  it("throws when JWT_SECRET is not configured", () => {
    expect(() => new JwtStrategy(config(undefined), users)).toThrow(
      "JWT_SECRET is not defined in .env",
    );
  });

  it("loads the current profile and rejects a deleted user", async () => {
    const strategy = new JwtStrategy(config("secret"), users);
    jest
      .mocked(users.findOne)
      .mockResolvedValueOnce({
        id: "u1",
        email: "a@b.com",
        name: "Ann",
        birthday: null,
      } as Awaited<ReturnType<UsersService["findOne"]>>)
      .mockResolvedValue(null);
    const token = { sub: "u1", email: "old@example.com", exp: 123 };
    await expect(strategy.validate(token)).resolves.toMatchObject({
      userId: "u1",
      name: "Ann",
      email: "a@b.com",
    });
    await expect(strategy.validate(token)).rejects.toThrow();
    await expect(strategy.validate({ ...token, sub: "" })).rejects.toThrow();
  });
});
