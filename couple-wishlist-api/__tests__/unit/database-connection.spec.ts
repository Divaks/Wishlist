import { ConfigService } from "@nestjs/config";
import { databaseConnection } from "../../src/database-connection";

describe("databaseConnection", () => {
  const local = {
    DB_HOST: "local-db",
    DB_PORT: "5433",
    DB_USERNAME: "local-user",
    DB_PASSWORD: "local-password",
    DB_NAME: "local-wishlist",
  };

  function config(values: Record<string, string | undefined> = {}) {
    return new ConfigService(values);
  }

  beforeEach(() => {
    jest.replaceProperty(process, "env", {});
  });

  afterEach(() => jest.restoreAllMocks());

  it("uses only the URL for database credentials and preserves its parameters", () => {
    const url =
      "postgresql://wishlist:placeholder@ep-example.neon.tech:5432/wishlist?sslmode=verify-full&channel_binding=require";

    expect(databaseConnection(config({ ...local, DATABASE_URL: url }))).toEqual(
      { url, extra: { enableChannelBinding: true } },
    );
  });

  it("accepts a URL without a channel binding parameter", () => {
    const url = "postgresql://wishlist:placeholder@localhost/wishlist";

    expect(databaseConnection(config({ DATABASE_URL: url }))).toEqual({
      url,
      extra: { enableChannelBinding: false },
    });
  });

  it.each([undefined, "", "  "])(
    "uses DB_* settings when DATABASE_URL is %p",
    (url) => {
      expect(
        databaseConnection(config({ ...local, DATABASE_URL: url })),
      ).toEqual({
        host: "local-db",
        port: 5433,
        username: "local-user",
        password: "local-password",
        database: "local-wishlist",
      });
    },
  );

  it("preserves the local defaults", () => {
    expect(databaseConnection(config())).toEqual({
      host: "localhost",
      port: 5432,
      username: "postgres",
      password: undefined,
      database: "wishlist_db",
    });
  });

  it.each(["invalid-secret", "https://user:secret@example.org", "postgresql:"])(
    "reports an invalid URL without including its value",
    (url) => {
      expect(() => databaseConnection(config({ DATABASE_URL: url }))).toThrow(
        "DATABASE_URL must be a PostgreSQL connection URL",
      );
    },
  );
});
