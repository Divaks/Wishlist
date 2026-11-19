import { Module } from "@nestjs/common";
import { User } from "./models/user.model";
import { WishItem } from "./models/wish-item.model";
import { Group } from "./models/group.model";
import { GroupMember } from "./models/group-member.model";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UsersModule } from "./modules/users.module";
import { AuthModule } from "./modules/auth.module";
import { WishlistModule } from "./modules/wishlist.module";
import { GroupsModule } from "./modules/groups.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? "local"}`, ".env"],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get<string>("DB_HOST", "localhost"),
        port: Number(config.get<string>("DB_PORT", "5432")),
        username: config.get<string>("DB_USERNAME", "postgres"),
        password: config.get<string>("DB_PASSWORD", "postgres"),
        database: config.get<string>("DB_NAME", "wishlist_db"),
        autoLoadEntities: true,
        entities: [User, WishItem, Group, GroupMember],
        synchronize: config.get<string>("DB_SYNCHRONIZE", "true") === "true",
      }),
    }),
    UsersModule,
    AuthModule,
    WishlistModule,
    GroupsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
