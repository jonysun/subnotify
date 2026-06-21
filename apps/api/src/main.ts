import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { configureApp } from "./bootstrap.js";
import type { AppEnv } from "./config/env.js";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  configureApp(app);

  const config = app.get(ConfigService<AppEnv, true>);
  await app.listen({ port: config.get("PORT", { infer: true }), host: "0.0.0.0" });
}

void bootstrap();
