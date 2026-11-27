import { WishlistSchema1795300000000 } from "./migrations/1795300000000-wishlist-schema";
import { WishPhotos1795300000001 } from "./migrations/1795300000001-wish-photos";
import { WishCurrency1795300000002 } from "./migrations/1795300000002-wish-currency";
import { Module } from "@nestjs/common";
import { User } from "./models/user.model";
import { WishItem } from "./models/wish-item.model";
import { Group } from "./models/group.model";
import { GroupMember } from "./models/group-member.model";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { UsersModule } from "./modules/users.module";
import { AuthModule } from "./modules/auth.module";
import { WishlistModule } from "./modules/wishlist.module";
import { GroupsModule } from "./modules/groups.module";
import { HealthController } from "./controllers/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? "local"}`,
        ".env",
        "../.env",
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get<string>("DB_HOST", "localhost"),
        port: Number(config.get<string>("DB_PORT", "5432")),
        username: config.get<string>("DB_USERNAME", "postgres"),
        password: config.get<string>("DB_PASSWORD"),
        database: config.get<string>("DB_NAME", "wishlist_db"),
        autoLoadEntities: true,
        entities: [User, WishItem, Group, GroupMember],
        synchronize: false,
        migrations: [
          WishlistSchema1795300000000,
          WishPhotos1795300000001,
          WishCurrency1795300000002,
        ],
        migrationsRun: true,
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    UsersModule,
    AuthModule,
    WishlistModule,
    GroupsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
