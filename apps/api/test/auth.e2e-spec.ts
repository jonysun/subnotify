import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DbService } from "../src/db/db.service.js";
import { userSettings, users } from "../src/db/schema.js";
import { createTestApp } from "../src/testing/app.js";

const tempDir = fileURLToPath(new URL("./tmp-auth", import.meta.url));
const dbPath = join(tempDir, "auth.e2e.sqlite");
const originalDbDriver = process.env.DB_DRIVER;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalJwtSecret = process.env.JWT_SECRET;
const originalNodeEnv = process.env.NODE_ENV;

beforeEach(async () => {
  await rm(tempDir, { force: true, recursive: true });
  await mkdir(dirname(dbPath), { recursive: true });
  process.env.DB_DRIVER = "sqlite";
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.JWT_SECRET = "test-auth-secret-change-me";
  process.env.NODE_ENV = "test";
});

afterEach(async () => {
  process.env.DB_DRIVER = originalDbDriver;
  process.env.DATABASE_URL = originalDatabaseUrl;
  process.env.JWT_SECRET = originalJwtSecret;
  process.env.NODE_ENV = originalNodeEnv;
  await rm(tempDir, { force: true, recursive: true });
});

async function seedAdmin(db: DbService["db"], username: string) {
  const adminId = randomUUID();
  await db.insert(users).values({
    id: adminId,
    username,
    displayName: "Administrator",
    passwordHash: await argon2.hash("admin123456"),
    role: "admin",
    status: "active"
  });
  await db.insert(userSettings).values({
    id: randomUUID(),
    userId: adminId,
    baseCurrency: "CNY",
    exchangeRateProvider: "mock",
    dataSharingEnabled: false
  });
  return adminId;
}

describe("auth and users", () => {
  it("authenticates seeded admin and manages ordinary users", async () => {
    const suffix = randomUUID();
    const adminUsername = `admin-${suffix}`;
    const ordinaryUsername = `alice-${suffix}`;
    const app = await createTestApp();
    try {
      const db = app.get(DbService).db;
      await seedAdmin(db, adminUsername);

      const adminLogin = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ username: adminUsername, password: "admin123456" })
        .expect(201);

      expect(adminLogin.body.accessToken).toEqual(expect.any(String));
      expect(adminLogin.body.user).toMatchObject({ username: adminUsername, role: "admin" });
      expect(adminLogin.body.user.passwordHash).toBeUndefined();

      const adminToken = adminLogin.body.accessToken as string;
      const created = await request(app.getHttpServer())
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ username: ordinaryUsername, displayName: "Alice", password: "alice123456" })
        .expect(201);

      expect(created.body).toMatchObject({ username: ordinaryUsername, role: "user", status: "active" });
      expect(created.body.passwordHash).toBeUndefined();

      const aliceRows = await db.select().from(users).where(eq(users.username, ordinaryUsername));
      const settingsRows = await db.select().from(userSettings).where(eq(userSettings.userId, aliceRows[0]!.id));
      expect(settingsRows[0]?.baseCurrency).toBe("CNY");

      const userLogin = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ username: ordinaryUsername, password: "alice123456" })
        .expect(201);

      const userToken = userLogin.body.accessToken as string;
      await request(app.getHttpServer()).get("/api/admin/users").set("Authorization", `Bearer ${userToken}`).expect(403);

      const updatedSettings = await request(app.getHttpServer())
        .patch("/api/me/settings")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ baseCurrency: "USD", exchangeRateProvider: "mock", dataSharingEnabled: true })
        .expect(200);

      expect(updatedSettings.body).toMatchObject({
        baseCurrency: "USD",
        exchangeRateProvider: "mock",
        dataSharingEnabled: true
      });
    } finally {
      await app.close();
    }
  });
});
