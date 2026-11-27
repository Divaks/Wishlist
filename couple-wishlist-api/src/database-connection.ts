import { ConfigService } from "@nestjs/config";

export function databaseConnection(config: ConfigService) {
  const url = config.get<string>("DATABASE_URL")?.trim();
  if (url) {
    const parsed = URL.parse(url);
    if (
      !parsed?.hostname ||
      !["postgres:", "postgresql:"].includes(parsed.protocol)
    ) {
      throw new Error("DATABASE_URL must be a PostgreSQL connection URL");
    }

    return {
      url,
      // pg reads TLS from the URL and enables channel binding via a pool option.
      extra: {
        enableChannelBinding:
          parsed.searchParams.get("channel_binding") === "require",
      },
    };
  }

  return {
    host: config.get<string>("DB_HOST", "localhost"),
    port: Number(config.get<string>("DB_PORT", "5432")),
    username: config.get<string>("DB_USERNAME", "postgres"),
    password: config.get<string>("DB_PASSWORD"),
    database: config.get<string>("DB_NAME", "wishlist_db"),
  };
}
