import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DbService } from "../src/db/db.service.js";
import { userSettings, users } from "../src/db/schema.js";
import { AutoRenewService } from "../src/modules/subscriptions/auto-renew.service.js";
import { createTestApp } from "../src/testing/app.js";

const tempDir = fileURLToPath(new URL("./tmp-payments", import.meta.url));
const dbPath = join(tempDir, "payments.e2e.sqlite");
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
  process.env.JWT_SECRET = "test-payments-secret";
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
  const username = `pay-user-${id}`;
  await db.insert(users).values({
    id,
    username,
    displayName: "Payment User",
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
  return { token: login.body.accessToken as string };
}

describe("payments and exchange rates", () => {
  it("converts payments, supports manual base amounts, snapshots subscriptions, and auto-renews with rates", async () => {
    const app = await createTestApp();
    try {
      const { token } = await createUserAndToken(app);
      const auth = { Authorization: `Bearer ${token}` };

      const rate = await request(app.getHttpServer()).get("/api/exchange-rates?base=USD&quote=CNY").set(auth).expect(200);
      expect(rate.body).toMatchObject({ baseCurrency: "USD", quoteCurrency: "CNY", rate: 7.1 });

      const subscription = await request(app.getHttpServer())
        .post("/api/subscriptions")
        .set(auth)
        .send({
          name: "Design Tool",
          paymentMethod: "Visa",
          currentCycle: "monthly",
          currentPrice: 10,
          currentCurrency: "USD",
          startDate: "2026-01-01T00:00:00.000Z",
          nextDueDate: "2026-01-10T00:00:00.000Z",
          autoRenew: true
        })
        .expect(201);

      const converted = await request(app.getHttpServer())
        .post("/api/payments")
        .set(auth)
        .send({
          subscriptionId: subscription.body.id,
          paidAt: "2026-01-02T00:00:00.000Z",
          originalAmount: 10,
          originalCurrency: "USD"
        })
        .expect(201);
      expect(converted.body).toMatchObject({
        originalAmount: 10,
        originalCurrency: "USD",
        baseAmount: 71,
        baseCurrency: "CNY",
        exchangeRate: 7.1,
        paymentMethodSnapshot: "Visa",
        cycleSnapshot: "monthly"
      });

      const manual = await request(app.getHttpServer())
        .post("/api/payments")
        .set(auth)
        .send({
          paidAt: "2026-01-03T00:00:00.000Z",
          originalAmount: 10,
          originalCurrency: "USD",
          baseAmount: 70,
          baseCurrency: "CNY",
          isBaseAmountManual: true
        })
        .expect(201);
      expect(manual.body).toMatchObject({ baseAmount: 70, isBaseAmountManual: true, exchangeRate: 7 });

      await app.get(AutoRenewService).processDueSubscriptions(new Date("2026-01-20T00:00:00.000Z"));
      const payments = await request(app.getHttpServer()).get("/api/payments").set(auth).expect(200);
      const auto = payments.body.find((payment: { source: string }) => payment.source === "auto_renewal");
      expect(auto).toMatchObject({ baseCurrency: "CNY", exchangeRate: 7.1, baseAmount: 71 });
    } finally {
      await app.close();
    }
  });
});
