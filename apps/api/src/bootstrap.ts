import { ConfigService } from "@nestjs/config";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { AppEnv } from "./config/env.js";

export function configureApp(app: NestFastifyApplication) {
  app.setGlobalPrefix("api");

  const config = app.get(ConfigService<AppEnv, true>);
  app.enableCors({
    origin: config.get("CORS_ORIGIN", { infer: true }),
    credentials: true
  });

  const docs = new DocumentBuilder()
    .setTitle("Subscription Expense Manager API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, docs));
}
