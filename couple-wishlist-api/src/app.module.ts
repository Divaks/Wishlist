import { Module } from '@nestjs/common';
import { User } from './models/user.model';
import { WishItem } from './models/wish-item.model';
import { Group } from './models/group.model';
import { GroupMember } from './models/group-member.model';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './modules/users.module';
import { AuthModule } from './modules/auth.module';
import { WishlistModule } from './modules/wishlist.module';
import { GroupsModule } from './modules/groups.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV || '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'wishlist_db',
      autoLoadEntities: true,
      entities: [User, WishItem, Group, GroupMember],
      synchronize: true,
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
