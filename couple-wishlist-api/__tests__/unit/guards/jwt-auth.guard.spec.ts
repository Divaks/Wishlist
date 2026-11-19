import { AuthGuard } from "@nestjs/passport";
import { JwtAuthGuard } from "../../../src/guards/jwt-auth.guard";

describe("JwtAuthGuard", () => {
  it('is a passport "jwt" guard', () => {
    const guard = new JwtAuthGuard();
    expect(guard).toBeInstanceOf(AuthGuard("jwt"));
    expect(typeof guard.canActivate).toBe("function");
  });
});
