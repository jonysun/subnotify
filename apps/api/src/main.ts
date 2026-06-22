import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { AppModule } from "./app.module.js";
import { configureApp } from "./bootstrap.js";
import type { AppEnv } from "./config/env.js";

async function registerProductionWebUi(app: NestFastifyApplication, config: ConfigService<AppEnv, true>) {
  if (config.get("NODE_ENV", { infer: true }) !== "production") {
    return;
  }

  const webDist = resolve(process.cwd(), "apps/web/dist");
  if (!existsSync(webDist)) {
    return;
  }

  await app.register(fastifyStatic, { root: webDist, prefix: "/", index: false });
  app.getHttpAdapter().getInstance().setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api")) {
      reply.code(404).send({ statusCode: 404, message: "Not Found" });
      return;
    }
    reply.sendFile("index.html");
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  configureApp(app);

  const config = app.get(ConfigService<AppEnv, true>);
  await registerProductionWebUi(app, config);
  await app.listen({ port: config.get("PORT", { infer: true }), host: "0.0.0.0" });
}

void bootstrap();
