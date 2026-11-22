import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "../services/auth.service";
import { UsersModule } from "./users.module";
import { JwtStrategy } from "../strategies/jwt.strategy";
import { AuthController } from "../controllers/auth.controller";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>("JWT_SECRET");
        if (
          !secret ||
          secret.length < 32 ||
          secret === "your-super-secret-jwt-key-at-least-32-chars"
        ) {
          throw new Error("JWT_SECRET must be at least 32 characters long");
        }
        return {
          secret,
          signOptions: { expiresIn: "1d" },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
