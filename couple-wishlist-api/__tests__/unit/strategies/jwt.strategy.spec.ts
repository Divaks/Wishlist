import { ConfigService } from "@nestjs/config";
import { JwtStrategy } from "../../../src/strategies/jwt.strategy";

describe("JwtStrategy", () => {
  const config = (secret?: string) =>
    ({ get: jest.fn().mockReturnValue(secret) }) as unknown as ConfigService;

  it("throws when JWT_SECRET is not configured", () => {
    expect(() => new JwtStrategy(config(undefined))).toThrow(
      "JWT_SECRET is not defined in .env",
    );
  });

  it("maps the JWT payload to the request user", () => {
    const strategy = new JwtStrategy(config("secret"));
    expect(
      strategy.validate({
        sub: "u1",
        email: "a@b.com",
        partnerId: "p1",
        exp: 123,
      }),
    ).toEqual({ userId: "u1", email: "a@b.com", partnerId: "p1" });
  });

  it("keeps a null partnerId", () => {
    const strategy = new JwtStrategy(config("secret"));
    expect(
      strategy.validate({
        sub: "u1",
        email: "a@b.com",
        partnerId: null,
        exp: 1,
      }).partnerId,
    ).toBeNull();
  });
});
