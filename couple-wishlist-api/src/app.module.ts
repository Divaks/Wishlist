import { Module } from '@nestjs/common';
import { User } from './entities/user.entity';
import { WishItem } from './entities/wish-item.entity';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { GroupsModule } from './groups/groups.module';

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
