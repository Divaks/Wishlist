import { WishlistSchema1795300000000 } from "./migrations/1795300000000-wishlist-schema";
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
import { databaseConnection } from "./database-connection";

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
        ...databaseConnection(config),
        autoLoadEntities: true,
        entities: [User, WishItem, Group, GroupMember],
        synchronize: false,
        migrations: [WishlistSchema1795300000000],
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
