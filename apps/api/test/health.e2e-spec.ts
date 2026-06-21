import { describe, expect, it } from "vitest";
import request from "supertest";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/bootstrap.js";

describe("health", () => {
  it("returns app status", async () => {
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { logger: false });
    configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const response = await request(app.getHttpServer()).get("/api/health").expect(200);
    expect(response.body).toEqual({ status: "ok", service: "subscription-expense-manager" });
    await app.close();
  });
});
