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

const tempDir = fileURLToPath(new URL("./tmp-dashboard", import.meta.url));
const dbPath = join(tempDir, "dashboard.e2e.sqlite");
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
  process.env.JWT_SECRET = "test-dashboard-secret";
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
  const username = `dash-user-${id}`;
  await db.insert(users).values({
    id,
    username,
    displayName: "Dashboard User",
    passwordHash: await argon2.hash("password123"),
    role: "user",
    status: "active"
  });
  await db.insert(userSettings).values({ id: randomUUID(), userId: id, baseCurrency: "CNY", exchangeRateProvider: "mock" });
  const login = await request(app.getHttpServer()).post("/api/auth/login").send({ username, password: "password123" }).expect(201);
  return { token: login.body.accessToken as string };
}

describe("dashboard", () => {
  it("returns SubsTracker-style dashboard statistics", async () => {
    const app = await createTestApp();
    try {
      const { token } = await createUserAndToken(app);
      const auth = { Authorization: `Bearer ${token}` };
      const sub = await request(app.getHttpServer())
        .post("/api/subscriptions")
        .set(auth)
        .send({
          name: "Video",
          currentCycle: "monthly",
          currentPrice: 30,
          currentCurrency: "CNY",
          categoryName: "影音",
          startDate: "2026-06-01T00:00:00.000Z",
          nextDueDate: "2026-06-27T00:00:00.000Z",
          remindersEnabled: true
        })
        .expect(201);
      await request(app.getHttpServer())
        .post("/api/payments")
        .set(auth)
        .send({ subscriptionId: sub.body.id, paidAt: "2026-06-20T00:00:00.000Z", originalAmount: 30, originalCurrency: "CNY" })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get("/api/dashboard/stats?now=2026-06-25T00:00:00.000Z")
        .set(auth)
        .expect(200);

      expect(response.body).toMatchObject({
        monthlyExpense: { amount: 30 },
        yearlyExpense: { amount: 30, monthlyAverage: 2.5 },
        activeSubscriptions: { active: 1, total: 1, expiringSoon: 1 }
      });
      expect(response.body.recentPayments[0]).toMatchObject({ name: "Video", amount: 30, currency: "CNY" });
      expect(response.body.upcomingRenewals[0]).toMatchObject({ name: "Video", amount: 30, currency: "CNY" });
      expect(response.body.expenseByCategory[0]).toMatchObject({ category: "影音", amount: 30, percentage: 100 });
    } finally {
      await app.close();
    }
  });
});
