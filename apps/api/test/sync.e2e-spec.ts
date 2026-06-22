import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DbService } from "../src/db/db.service.js";
import { userSettings, users } from "../src/db/schema.js";
import { createTestApp } from "../src/testing/app.js";

const tempDir = fileURLToPath(new URL("./tmp-sync", import.meta.url));
const dbPath = join(tempDir, "sync.e2e.sqlite");
const originalEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  DB_DRIVER: process.env.DB_DRIVER,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV
};

beforeEach(async () => {
  await rm(tempDir, { force: true, recursive: true });
  await mkdir(dirname(dbPath), { recursive: true });
  process.env.DB_DRIVER = "sqlite";
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.JWT_SECRET = "test-sync-secret";
  process.env.NODE_ENV = "test";
});

afterEach(async () => {
  process.env.DATABASE_URL = originalEnv.DATABASE_URL;
  process.env.DB_DRIVER = originalEnv.DB_DRIVER;
  process.env.JWT_SECRET = originalEnv.JWT_SECRET;
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  await rm(tempDir, { force: true, recursive: true });
});

async function createUserAndToken(app: Awaited<ReturnType<typeof createTestApp>>) {
  const db = app.get(DbService).db;
  const id = randomUUID();
  const username = `sync-user-${id}`;
  await db.insert(users).values({ id, username, displayName: "Sync User", passwordHash: await argon2.hash("password123"), role: "user", status: "active" });
  await db.insert(userSettings).values({ id: randomUUID(), userId: id, baseCurrency: "CNY", exchangeRateProvider: "mock" });
  const login = await request(app.getHttpServer()).post("/api/auth/login").send({ username, password: "password123" }).expect(201);
  return { token: login.body.accessToken as string };
}

describe("sync", () => {
  it("pulls recorded events and pushes newer subscription and payment versions", async () => {
    const app = await createTestApp();
    try {
      const { token } = await createUserAndToken(app);
      const auth = { Authorization: `Bearer ${token}` };
      const subscription = await request(app.getHttpServer())
        .post("/api/subscriptions")
        .set(auth)
        .send({ name: "Sync Sub", currentCycle: "monthly", currentPrice: 10, currentCurrency: "CNY", startDate: "2026-01-01T00:00:00.000Z", nextDueDate: "2026-02-01T00:00:00.000Z" })
        .expect(201);
      const payment = await request(app.getHttpServer())
        .post("/api/payments")
        .set(auth)
        .send({ subscriptionId: subscription.body.id, paidAt: "2026-01-01T00:00:00.000Z", originalAmount: 10, originalCurrency: "CNY" })
        .expect(201);

      const pull = await request(app.getHttpServer()).get("/api/sync/pull").set(auth).expect(200);
      expect(pull.body.events.map((event: { resource: string }) => event.resource).sort()).toEqual(["payments", "subscriptions"]);
      const secondPull = await request(app.getHttpServer()).get(`/api/sync/pull?since=${encodeURIComponent(pull.body.cursor)}`).set(auth).expect(200);
      expect(secondPull.body.events).toHaveLength(0);

      const pushed = await request(app.getHttpServer())
        .post("/api/sync/push")
        .set(auth)
        .send({
          events: [
            { resource: "subscriptions", resourceId: subscription.body.id, version: 5, data: { name: "Synced Sub", currentPrice: 11 } },
            { resource: "payments", resourceId: payment.body.id, version: 3, data: { notes: "synced note", originalAmount: 12, originalCurrency: "CNY", paidAt: "2026-01-02T00:00:00.000Z" } }
          ]
        })
        .expect(201);
      expect(pushed.body).toMatchObject({ applied: 2 });

      const updatedSubscription = await request(app.getHttpServer()).get(`/api/subscriptions/${subscription.body.id}`).set(auth).expect(200);
      expect(updatedSubscription.body).toMatchObject({ name: "Synced Sub", currentPrice: 11, version: 5 });
      const updatedPayment = await request(app.getHttpServer()).get(`/api/payments/${payment.body.id}`).set(auth).expect(200);
      expect(updatedPayment.body).toMatchObject({ notes: "synced note", originalAmount: 12, version: 3 });

      await request(app.getHttpServer())
        .post("/api/sync/push")
        .set(auth)
        .send({ events: [{ resource: "unknown", resourceId: randomUUID(), version: 1, data: {} }] })
        .expect(501);
    } finally {
      await app.close();
    }
  });
});