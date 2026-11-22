import { INestApplication, ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
export function configureApp(app: INestApplication) {
  // Security middleware
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
