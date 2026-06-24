import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DbService } from "../src/db/db.service.js";
import { notificationLogs, userSettings, users } from "../src/db/schema.js";
import { createTestApp } from "../src/testing/app.js";

const tempDir = fileURLToPath(new URL("./tmp-reminders", import.meta.url));
const dbPath = join(tempDir, "reminders.e2e.sqlite");
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
  process.env.JWT_SECRET = "test-reminders-secret";
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
  const username = `reminder-user-${id}`;
  await db.insert(users).values({
    id,
    username,
    displayName: "Reminder User",
    passwordHash: await argon2.hash("password123"),
    role: "user",
    status: "active"
  });
  await db.insert(userSettings).values({ id: randomUUID(), userId: id, baseCurrency: "CNY", exchangeRateProvider: "mock" });
  const login = await request(app.getHttpServer()).post("/api/auth/login").send({ username, password: "password123" }).expect(201);
  return { db, token: login.body.accessToken as string, userId: id };
}

describe("reminders and notifications", () => {
  it("creates channels and rules, tests delivery, and scans due subscriptions once", async () => {
    const app = await createTestApp();
    try {
      const { db, token, userId } = await createUserAndToken(app);
      const auth = { Authorization: `Bearer ${token}` };
      const channelPayloads = [
        { type: "smtp", config: { host: "smtp.local", to: "user@example.com" } },
        { type: "telegram", config: { botToken: "token", chatId: "chat" } },
        { type: "webhook", config: { url: "https://example.com/hook" } },
        { type: "bark", config: { endpoint: "https://example.com/bark" } },
        { type: "serverchan", config: { sendKey: "key" } },
        { type: "pushplus", config: { token: "token" } }
      ] as const;

      const channels = [];
      for (const payload of channelPayloads) {
        const response = await request(app.getHttpServer())
          .post("/api/notification-channels")
          .set(auth)
          .send({ ...payload, name: `${payload.type} channel` })
          .expect(201);
        channels.push(response.body);
      }
      expect(channels.map((channel) => channel.type)).toEqual(["smtp", "telegram", "webhook", "bark", "serverchan", "pushplus"]);

      await request(app.getHttpServer()).post(`/api/notification-channels/${channels[0].id}/test`).set(auth).expect(201);

      const rule = await request(app.getHttpServer())
        .post("/api/reminder-rules")
        .set(auth)
        .send({ name: "Three days", daysBefore: 3, channelIds: [channels[0].id] })
        .expect(201);
      expect(rule.body).toMatchObject({ name: "Three days", daysBefore: 3, enabled: true });

      await request(app.getHttpServer())
        .post("/api/subscriptions")
        .set(auth)
        .send({
          name: "Due Soon",
          currentCycle: "monthly",
          currentPrice: 12,
          currentCurrency: "CNY",
          startDate: "2026-01-01T00:00:00.000Z",
          nextDueDate: "2026-02-04T00:00:00.000Z",
          remindersEnabled: true
        })
        .expect(201);

      const firstRun = await request(app.getHttpServer())
        .post("/api/reminders/run")
        .set(auth)
        .send({ now: "2026-02-01T00:00:00.000Z" })
        .expect(201);
      expect(firstRun.body).toMatchObject({ scanned: 1, logged: 1 });

      const secondRun = await request(app.getHttpServer())
        .post("/api/reminders/run")
        .set(auth)
        .send({ now: "2026-02-01T00:00:00.000Z" })
        .expect(201);
      expect(secondRun.body).toMatchObject({ scanned: 1, logged: 0 });

      const logs = (await db.select().from(notificationLogs)).filter((log) => log.userId === userId);
      expect(logs.filter((log) => log.type === "test_delivery")).toHaveLength(1);
      expect(logs.filter((log) => log.type === "subscription_reminder")).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it("replaces subscription-specific reminder rules and repeats after expiry hourly", async () => {
    const app = await createTestApp();
    try {
      const { db, token, userId } = await createUserAndToken(app);
      const auth = { Authorization: `Bearer ${token}` };

      const subscription = await request(app.getHttpServer())
        .post("/api/subscriptions")
        .set(auth)
        .send({
          name: "Overdue Service",
          currentCycle: "monthly",
          currentPrice: 12,
          currentCurrency: "CNY",
          startDate: "2026-01-01T00:00:00.000Z",
          nextDueDate: "2026-02-01T00:00:00.000Z",
          remindersEnabled: true
        })
        .expect(201);

      const replaced = await request(app.getHttpServer())
        .put(`/api/subscriptions/${subscription.body.id}/reminders`)
        .set(auth)
        .send({
          rules: [
            { name: "到期前 1 天", type: "before_expiry", value: 1, unit: "days", enabled: true, channelIds: [] },
            { name: "到期后每 6 小时", type: "after_expiry", value: 0, unit: "hours", repeatIntervalHours: 6, repeatUntil: "renewed", enabled: true, channelIds: [] }
          ]
        })
        .expect(200);
      expect(replaced.body.rules.map((rule: { type: string }) => rule.type)).toEqual(["before_expiry", "after_expiry"]);

      const list = await request(app.getHttpServer()).get(`/api/subscriptions/${subscription.body.id}/reminders`).set(auth).expect(200);
      expect(list.body.rules).toHaveLength(2);

      const firstRun = await request(app.getHttpServer())
        .post("/api/reminders/run")
        .set(auth)
        .send({ now: "2026-02-01T06:00:00.000Z" })
        .expect(201);
      expect(firstRun.body).toMatchObject({ scanned: 1, logged: 1 });

      const duplicateWindow = await request(app.getHttpServer())
        .post("/api/reminders/run")
        .set(auth)
        .send({ now: "2026-02-01T08:00:00.000Z" })
        .expect(201);
      expect(duplicateWindow.body).toMatchObject({ scanned: 1, logged: 0 });

      const nextWindow = await request(app.getHttpServer())
        .post("/api/reminders/run")
        .set(auth)
        .send({ now: "2026-02-01T12:00:00.000Z" })
        .expect(201);
      expect(nextWindow.body).toMatchObject({ scanned: 1, logged: 1 });

      const logs = (await db.select().from(notificationLogs)).filter((log) => log.userId === userId && log.subscriptionId === subscription.body.id);
      expect(logs).toHaveLength(2);
    } finally {
      await app.close();
    }
  });
});
