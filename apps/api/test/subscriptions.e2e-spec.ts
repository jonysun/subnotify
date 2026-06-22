import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DbService } from "../src/db/db.service.js";
import { payments, subscriptionVersions, userSettings, users } from "../src/db/schema.js";
import { AutoRenewService } from "../src/modules/subscriptions/auto-renew.service.js";
import { createTestApp } from "../src/testing/app.js";

const tempDir = fileURLToPath(new URL("./tmp-subscriptions", import.meta.url));
const dbPath = join(tempDir, "subscriptions.e2e.sqlite");
const originalEnv = {
  DB_DRIVER: process.env.DB_DRIVER,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV
};

beforeEach(async () => {
  await rm(tempDir, { force: true, recursive: true });
  await mkdir(dirname(dbPath), { recursive: true });
  process.env.DB_DRIVER = "sqlite";
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.JWT_SECRET = "test-subscriptions-secret";
  process.env.NODE_ENV = "test";
});

afterEach(async () => {
  process.env.DB_DRIVER = originalEnv.DB_DRIVER;
  process.env.DATABASE_URL = originalEnv.DATABASE_URL;
  process.env.JWT_SECRET = originalEnv.JWT_SECRET;
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  await rm(tempDir, { force: true, recursive: true });
});

async function createUserAndToken(app: Awaited<ReturnType<typeof createTestApp>>) {
  const db = app.get(DbService).db;
  const id = randomUUID();
  const username = `sub-user-${id}`;
  await db.insert(users).values({
    id,
    username,
    displayName: "Subscription User",
    passwordHash: await argon2.hash("password123"),
    role: "user",
    status: "active"
  });
  await db.insert(userSettings).values({
    id: randomUUID(),
    userId: id,
    baseCurrency: "CNY",
    exchangeRateProvider: "mock"
  });
  const login = await request(app.getHttpServer()).post("/api/auth/login").send({ username, password: "password123" }).expect(201);
  return { db, token: login.body.accessToken as string };
}

describe("subscriptions", () => {
  it("tracks versions, expiration, unavailable records, and auto-renew payments", async () => {
    const app = await createTestApp();
    try {
      const { db, token } = await createUserAndToken(app);
      const auth = { Authorization: `Bearer ${token}` };

      const created = await request(app.getHttpServer())
        .post("/api/subscriptions")
        .set(auth)
        .send({
          name: "Music",
          siteUrl: "https://example.com",
          paymentMethod: "Visa",
          currentCycle: "monthly",
          currentPrice: 20,
          currentCurrency: "CNY",
          startDate: "2026-01-01T00:00:00.000Z",
          nextDueDate: "2026-02-01T00:00:00.000Z",
          autoRenew: false,
          notes: "family"
        })
        .expect(201);

      const firstVersions = await db
        .select()
        .from(subscriptionVersions)
        .where(eq(subscriptionVersions.subscriptionId, created.body.id));
      expect(firstVersions.map((version) => version.version)).toEqual([1]);

      const updated = await request(app.getHttpServer())
        .patch(`/api/subscriptions/${created.body.id}`)
        .set(auth)
        .send({ currentCycle: "yearly", currentPrice: 200 })
        .expect(200);
      expect(updated.body).toMatchObject({ currentCycle: "yearly", version: 2 });

      const versions = await request(app.getHttpServer())
        .get(`/api/subscriptions/${created.body.id}/versions`)
        .set(auth)
        .expect(200);
      expect(versions.body.map((version: { version: number }) => version.version)).toEqual([1, 2]);

      const unavailable = await request(app.getHttpServer())
        .patch(`/api/subscriptions/${created.body.id}`)
        .set(auth)
        .send({ status: "unavailable" })
        .expect(200);
      expect(unavailable.body).toMatchObject({ status: "unavailable", deletedAt: null });

      const expiring = await request(app.getHttpServer())
        .post("/api/subscriptions")
        .set(auth)
        .send({
          name: "Old Monthly",
          currentCycle: "monthly",
          currentPrice: 8,
          currentCurrency: "CNY",
          startDate: "2026-01-01T00:00:00.000Z",
          nextDueDate: "2026-01-10T00:00:00.000Z",
          autoRenew: false
        })
        .expect(201);

      const renewing = await request(app.getHttpServer())
        .post("/api/subscriptions")
        .set(auth)
        .send({
          name: "Cloud",
          paymentMethod: "Alipay",
          currentCycle: "monthly",
          currentPrice: 30,
          currentCurrency: "CNY",
          startDate: "2026-01-01T00:00:00.000Z",
          nextDueDate: "2026-01-10T00:00:00.000Z",
          autoRenew: true
        })
        .expect(201);

      await app.get(AutoRenewService).processDueSubscriptions(new Date("2026-01-20T00:00:00.000Z"));

      const expired = await request(app.getHttpServer()).get(`/api/subscriptions/${expiring.body.id}`).set(auth).expect(200);
      expect(expired.body).toMatchObject({ status: "expired", deletedAt: null });

      const active = await request(app.getHttpServer()).get(`/api/subscriptions/${renewing.body.id}`).set(auth).expect(200);
      expect(active.body).toMatchObject({ status: "active", nextDueDate: "2026-02-10T00:00:00.000Z" });

      const autoPayments = await db.select().from(payments).where(eq(payments.subscriptionId, renewing.body.id));
      expect(autoPayments[0]).toMatchObject({ source: "auto_renewal", originalAmount: 30, baseAmount: 30 });
    } finally {
      await app.close();
    }
  });
});
