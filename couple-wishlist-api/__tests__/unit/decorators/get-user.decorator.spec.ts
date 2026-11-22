import { ExecutionContext } from "@nestjs/common";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { GetUser } from "../../../src/decorators/get-user.decorator";

class Probe {
  whole(@GetUser() _user: unknown) {}
  one(@GetUser("userId") _id: string) {}
}

const factoryFor = (method: "whole" | "one") => {
  const meta = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    Probe,
    method,
  ) as Record<
    string,
    { factory: (d: unknown, c: ExecutionContext) => unknown; data: unknown }
  >;
  return Object.values(meta)[0];
};

const ctx = (user: unknown) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe("GetUser decorator", () => {
  const user = { userId: "u1", email: "a@b.com", partnerId: "p1" };

  it("returns the whole user when no key is given", () => {
    const { factory, data } = factoryFor("whole");
    expect(factory(data, ctx(user))).toBe(user);
  });

  it("returns a single property when a key is given", () => {
    const { factory, data } = factoryFor("one");
    expect(data).toBe("userId");
    expect(factory(data, ctx(user))).toBe("u1");
  });

  it("returns undefined for a key when there is no user", () => {
    const { factory, data } = factoryFor("one");
    expect(factory(data, ctx(undefined))).toBeUndefined();
  });
});
