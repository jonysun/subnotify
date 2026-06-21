import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module.js";
import { DbService } from "./db.service.js";
import { users, userSettings } from "./schema.js";
import argon2 from "argon2";
import { ConfigService } from "@nestjs/config";
import type { AppEnv } from "../config/env.js";

const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

try {
  const config = app.get(ConfigService<AppEnv, true>);
  const db = app.get(DbService).db;
  const username = config.get("INITIAL_ADMIN_USERNAME", { infer: true });
  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (existing.length === 0) {
    const adminId = randomUUID();
    const passwordHash = await argon2.hash(config.get("INITIAL_ADMIN_PASSWORD", { infer: true }));

    await db.insert(users).values({
      id: adminId,
      username,
      displayName: config.get("INITIAL_ADMIN_DISPLAY_NAME", { infer: true }),
      passwordHash,
      role: "admin",
      status: "active"
    });
    await db.insert(userSettings).values({
      id: randomUUID(),
      userId: adminId,
      baseCurrency: "CNY",
      exchangeRateProvider: config.get("EXCHANGE_RATE_PROVIDER", { infer: true }),
      dataSharingEnabled: false
    });

    console.log(`Created initial admin user '${username}'`);
  } else {
    console.log(`Initial admin user '${username}' already exists`);
  }
} finally {
  await app.close();
}
