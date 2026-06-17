# Subscription Expense Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first-phase self-hosted subscription and expense manager with a Dockerized NestJS API, Vue 3 WebUI, SQLite default storage, optional PostgreSQL deployment, multi-user auth, subscriptions, payments, exchange rates, reminders, backups, admin tools, and mobile-ready sync APIs.

**Architecture:** Use an npm workspace monorepo with `apps/api`, `apps/web`, and `packages/shared`. The API owns persistence, auth, RBAC, scheduled jobs, notifications, backup/restore, exchange rates, and sync. The WebUI consumes REST APIs through a small typed client and has separate ordinary-user and admin workspaces.

**Tech Stack:** npm workspaces, TypeScript, NestJS with Fastify, Drizzle ORM, SQLite via `better-sqlite3`, PostgreSQL via `postgres`, Vue 3, Vite, Pinia, Vue Router, TanStack Query for Vue, Vitest, Supertest, Docker Compose.

---

## File Structure

Create this repository structure:

```text
.
|-- .dockerignore
|-- .env.example
|-- .gitignore
|-- Dockerfile
|-- README.md
|-- docker-compose.yml
|-- drizzle.config.ts
|-- package.json
|-- tsconfig.base.json
|-- apps
|   |-- api
|   |   |-- package.json
|   |   |-- src
|   |   |   |-- app.module.ts
|   |   |   |-- main.ts
|   |   |   |-- config
|   |   |   |   |-- app-config.module.ts
|   |   |   |   `-- env.ts
|   |   |   |-- common
|   |   |   |   |-- decorators
|   |   |   |   |-- filters
|   |   |   |   `-- guards
|   |   |   |-- db
|   |   |   |   |-- db.module.ts
|   |   |   |   |-- db.service.ts
|   |   |   |   |-- migrate.ts
|   |   |   |   |-- schema.ts
|   |   |   |   `-- seed.ts
|   |   |   |-- modules
|   |   |   |   |-- admin
|   |   |   |   |-- audit
|   |   |   |   |-- auth
|   |   |   |   |-- backups
|   |   |   |   |-- exchange-rates
|   |   |   |   |-- health
|   |   |   |   |-- notifications
|   |   |   |   |-- payments
|   |   |   |   |-- reminders
|   |   |   |   |-- subscriptions
|   |   |   |   |-- sync
|   |   |   |   |-- users
|   |   |   |   `-- user-settings
|   |   |   `-- testing
|   |   |       |-- app.ts
|   |   |       `-- auth.ts
|   |   |-- test
|   |   |-- tsconfig.json
|   |   `-- vitest.config.ts
|   `-- web
|       |-- package.json
|       |-- index.html
|       |-- src
|       |   |-- App.vue
|       |   |-- main.ts
|       |   |-- router.ts
|       |   |-- api
|       |   |-- components
|       |   |-- stores
|       |   |-- styles
|       |   `-- views
|       |-- tsconfig.json
|       `-- vite.config.ts
`-- packages
    `-- shared
        |-- package.json
        |-- src
        |   |-- enums.ts
        |   |-- index.ts
        |   `-- schemas.ts
        `-- tsconfig.json
```

## Task 1: Monorepo and Shared Types

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/schemas.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the root workspace files**

Create `package.json` with npm workspaces and scripts:

```json
{
  "name": "subscription-expense-manager",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "npm run dev -w @sem/api",
    "dev:web": "npm run dev -w @sem/web",
    "build": "npm run build -ws --if-present",
    "test": "npm run test -ws --if-present",
    "typecheck": "npm run typecheck -ws --if-present",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "npm run db:migrate -w @sem/api",
    "seed": "npm run seed -w @sem/api"
  },
  "engines": {
    "node": ">=20"
  },
  "devDependencies": {
    "drizzle-kit": "^0.24.0",
    "typescript": "^5.5.0"
  }
}
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@sem/shared": ["packages/shared/src/index.ts"]
    }
  }
}
```

Create `.gitignore`:

```gitignore
node_modules
dist
.env
.env.local
*.log
coverage
data
backups
drizzle
*.db
*.db-shm
*.db-wal
```

Create `.env.example`:

```dotenv
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
DB_DRIVER=sqlite
DATABASE_URL=file:./data/app.db
JWT_SECRET=change-me-in-production
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=admin123456
INITIAL_ADMIN_DISPLAY_NAME=Administrator
BACKUP_DIR=./backups
EXCHANGE_RATE_PROVIDER=mock
```

- [ ] **Step 2: Write shared package metadata and TypeScript config**

Create `packages/shared/package.json`:

```json
{
  "name": "@sem/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write shared enums**

Create `packages/shared/src/enums.ts`:

```ts
export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "disabled"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = ["active", "expired", "paused", "cancelled", "unavailable"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_CYCLES = ["weekly", "monthly", "quarterly", "yearly", "custom"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const PAYMENT_SOURCES = ["manual", "auto_renewal", "imported"] as const;
export type PaymentSource = (typeof PAYMENT_SOURCES)[number];

export const NOTIFICATION_CHANNELS = ["smtp", "telegram", "webhook", "bark", "serverchan", "pushplus"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
```

- [ ] **Step 4: Write shared validation schemas**

Create `packages/shared/src/schemas.ts`:

```ts
import { z } from "zod";
import { BILLING_CYCLES, NOTIFICATION_CHANNELS, PAYMENT_SOURCES, SUBSCRIPTION_STATUSES } from "./enums.js";

export const currencySchema = z.string().trim().length(3).transform((value) => value.toUpperCase());

export const createSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(160),
  siteUrl: z.string().url().optional().or(z.literal("")).default(""),
  paymentMethod: z.string().trim().max(80).optional().default(""),
  currentCycle: z.enum(BILLING_CYCLES),
  currentPrice: z.number().nonnegative(),
  currentCurrency: currencySchema.default("CNY"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  nextDueDate: z.string().datetime(),
  status: z.enum(SUBSCRIPTION_STATUSES).default("active"),
  autoRenew: z.boolean().default(false),
  categoryId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional().default(""),
  remindersEnabled: z.boolean().default(true)
});

export const createPaymentSchema = z.object({
  subscriptionId: z.string().uuid().optional(),
  paidAt: z.string().datetime(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  originalAmount: z.number().nonnegative(),
  originalCurrency: currencySchema,
  baseAmount: z.number().nonnegative().optional(),
  baseCurrency: currencySchema.default("CNY"),
  isBaseAmountManual: z.boolean().default(false),
  paymentMethodSnapshot: z.string().max(80).optional().default(""),
  cycleSnapshot: z.enum(BILLING_CYCLES).optional(),
  source: z.enum(PAYMENT_SOURCES).default("manual"),
  notes: z.string().max(2000).optional().default("")
});

export const createNotificationChannelSchema = z.object({
  type: z.enum(NOTIFICATION_CHANNELS),
  name: z.string().trim().min(1).max(120),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown())
});
```

Create `packages/shared/src/index.ts`:

```ts
export * from "./enums.js";
export * from "./schemas.js";
```

- [ ] **Step 5: Install dependencies and verify shared build**

Run:

```bash
npm install
npm run build -w @sem/shared
```

Expected: `package-lock.json` exists and `packages/shared/dist/index.d.ts` is created.

- [ ] **Step 6: Commit**

Run:

```bash
git add .gitignore .env.example package.json package-lock.json tsconfig.base.json packages/shared
git commit -m "chore: scaffold monorepo"
```

Expected: commit succeeds.

## Task 2: API Bootstrap and Health Endpoint

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/config/app-config.module.ts`
- Create: `apps/api/src/modules/health/health.controller.ts`
- Create: `apps/api/src/modules/health/health.module.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/test/health.e2e-spec.ts`

- [ ] **Step 1: Add API package**

Create `apps/api/package.json`:

```json
{
  "name": "@sem/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "db:migrate": "tsx src/db/migrate.ts",
    "seed": "tsx src/db/seed.ts"
  },
  "dependencies": {
    "@fastify/static": "^7.0.0",
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/platform-fastify": "^10.4.0",
    "@nestjs/schedule": "^4.1.0",
    "@nestjs/swagger": "^7.4.0",
    "@sem/shared": "file:../../packages/shared",
    "argon2": "^0.41.0",
    "better-sqlite3": "^11.1.0",
    "drizzle-orm": "^0.33.0",
    "postgres": "^3.4.0",
    "rxjs": "^7.8.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^20.14.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Add API configs**

Create `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "types": ["node"]
  },
  "include": ["src", "test"]
}
```

Create `apps/api/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.spec.ts"],
    testTimeout: 20000
  }
});
```

- [ ] **Step 3: Write failing health test**

Create `apps/api/test/health.e2e-spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import request from "supertest";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "../src/app.module.js";

describe("health", () => {
  it("returns app status", async () => {
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { logger: false });
    app.setGlobalPrefix("api");
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const response = await request(app.getHttpServer()).get("/api/health").expect(200);
    expect(response.body).toEqual({ status: "ok", service: "subscription-expense-manager" });
    await app.close();
  });
});
```

Run:

```bash
npm run test -w @sem/api -- health
```

Expected: fail because `AppModule` is not implemented.

- [ ] **Step 4: Implement config and health**

Create `apps/api/src/config/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DB_DRIVER: z.enum(["sqlite", "postgres"]).default("sqlite"),
  DATABASE_URL: z.string().default("file:./data/app.db"),
  JWT_SECRET: z.string().min(12).default("development-secret-change-me"),
  INITIAL_ADMIN_USERNAME: z.string().min(1).default("admin"),
  INITIAL_ADMIN_PASSWORD: z.string().min(8).default("admin123456"),
  INITIAL_ADMIN_DISPLAY_NAME: z.string().min(1).default("Administrator"),
  BACKUP_DIR: z.string().default("./backups"),
  EXCHANGE_RATE_PROVIDER: z.string().default("mock")
});

export type AppEnv = z.infer<typeof envSchema>;
export function parseEnv(input: NodeJS.ProcessEnv): AppEnv {
  return envSchema.parse(input);
}
```

Create `apps/api/src/config/app-config.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { parseEnv } from "./env.js";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: parseEnv })]
})
export class AppConfigModule {}
```

Create `apps/api/src/modules/health/health.controller.ts`:

```ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  health() {
    return { status: "ok", service: "subscription-expense-manager" };
  }
}
```

Create `apps/api/src/modules/health/health.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

Create `apps/api/src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { AppConfigModule } from "./config/app-config.module.js";
import { HealthModule } from "./modules/health/health.module.js";

@Module({ imports: [AppConfigModule, HealthModule] })
export class AppModule {}
```

Create `apps/api/src/main.ts`:

```ts
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import type { AppEnv } from "./config/env.js";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.setGlobalPrefix("api");
  app.enableCors({ origin: true, credentials: true });

  const docs = new DocumentBuilder()
    .setTitle("Subscription Expense Manager API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, docs));

  const config = app.get(ConfigService<AppEnv, true>);
  await app.listen(config.get("PORT", { infer: true }), "0.0.0.0");
}

void bootstrap();
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm install
npm run test -w @sem/api -- health
npm run typecheck -w @sem/api
git add apps/api package.json package-lock.json
git commit -m "feat(api): add NestJS bootstrap"
```

Expected: health test and typecheck pass, then commit succeeds.

## Task 3: Drizzle Database, Schema, Migration, and Seed

**Files:**
- Create: `drizzle.config.ts`
- Create: `apps/api/src/db/schema.ts`
- Create: `apps/api/src/db/db.service.ts`
- Create: `apps/api/src/db/db.module.ts`
- Create: `apps/api/src/db/migrate.ts`
- Create: `apps/api/src/db/seed.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/db.e2e-spec.ts`

- [ ] **Step 1: Add Drizzle config**

Create `drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

const driver = process.env.DB_DRIVER ?? "sqlite";

export default defineConfig({
  schema: "./apps/api/src/db/schema.ts",
  out: "./drizzle",
  dialect: driver === "postgres" ? "postgresql" : "sqlite",
  dbCredentials:
    driver === "postgres"
      ? { url: process.env.DATABASE_URL ?? "postgres://sem:sem@localhost:5432/sem" }
      : { url: (process.env.DATABASE_URL ?? "file:./data/app.db").replace(/^file:/, "") }
});
```

- [ ] **Step 2: Write failing database test**

Create `apps/api/test/db.e2e-spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { createTestApp } from "../src/testing/app.js";
import { DbService } from "../src/db/db.service.js";
import { users, userSettings } from "../src/db/schema.js";

describe("database", () => {
  it("creates a user with CNY settings", async () => {
    const app = await createTestApp();
    const db = app.get(DbService).db;
    const id = randomUUID();
    await db.insert(users).values({
      id,
      username: `schema-${id}`,
      displayName: "Schema User",
      passwordHash: "hash",
      role: "user",
      status: "active"
    });
    await db.insert(userSettings).values({ id: randomUUID(), userId: id, baseCurrency: "CNY", exchangeRateProvider: "mock" });
    const rows = await db.select().from(userSettings).where(eq(userSettings.userId, id));
    expect(rows[0]?.baseCurrency).toBe("CNY");
    await app.close();
  });
});
```

Run:

```bash
npm run test -w @sem/api -- db
```

Expected: fail because database module and schema do not exist.

- [ ] **Step 3: Write schema**

Create `apps/api/src/db/schema.ts` with Drizzle tables for:

- `users`
- `userSettings`
- `categories`
- `tags`
- `subscriptionTags`
- `subscriptions`
- `subscriptionVersions`
- `payments`
- `exchangeRates`
- `reminderRules`
- `notificationChannels`
- `notificationLogs`
- `syncEvents`
- `backups`
- `auditLogs`

Use text columns for enum values so SQLite and PostgreSQL share one TypeScript-level enum policy. Required columns must match the approved design spec names exactly, including `dataSharingEnabled`, `baseCurrency`, `nextDueDate`, `autoRenew`, `deletedAt`, `version`, `source`, and `isBaseAmountManual`.

- [ ] **Step 4: Write database service**

Create `apps/api/src/db/db.service.ts`:

```ts
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Database from "better-sqlite3";
import postgres from "postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";
import type { AppEnv } from "../config/env.js";

@Injectable()
export class DbService implements OnModuleDestroy {
  private sqlite?: Database.Database;
  private pg?: postgres.Sql;
  readonly db: ReturnType<typeof drizzleSqlite<typeof schema>> | ReturnType<typeof drizzlePostgres<typeof schema>>;

  constructor(config: ConfigService<AppEnv, true>) {
    const driver = config.get("DB_DRIVER", { infer: true });
    const url = config.get("DATABASE_URL", { infer: true });
    if (driver === "postgres") {
      this.pg = postgres(url);
      this.db = drizzlePostgres(this.pg, { schema });
    } else {
      const path = url.replace(/^file:/, "");
      this.sqlite = new Database(path);
      this.db = drizzleSqlite(this.sqlite, { schema });
    }
  }

  async onModuleDestroy() {
    this.sqlite?.close();
    await this.pg?.end();
  }
}
```

Create `apps/api/src/db/db.module.ts`:

```ts
import { Global, Module } from "@nestjs/common";
import { DbService } from "./db.service.js";

@Global()
@Module({ providers: [DbService], exports: [DbService] })
export class DbModule {}
```

- [ ] **Step 5: Write migration and seed scripts**

Create `apps/api/src/db/migrate.ts` to run Drizzle migrations from `./drizzle` for the configured driver. Create `apps/api/src/db/seed.ts` to create the initial admin if it does not exist, using `argon2.hash` and the `INITIAL_ADMIN_*` environment variables.

The seed must also create `userSettings` for the admin with `baseCurrency = "CNY"` and `exchangeRateProvider = EXCHANGE_RATE_PROVIDER`.

- [ ] **Step 6: Wire DbModule and testing helper**

Modify `apps/api/src/app.module.ts` to import `DbModule`.

Create `apps/api/src/testing/app.ts`:

```ts
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "../app.module.js";

export async function createTestApp() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { logger: false });
  app.setGlobalPrefix("api");
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
```

- [ ] **Step 7: Generate migration, migrate, seed, verify**

Run:

```bash
$env:DB_DRIVER="sqlite"; $env:DATABASE_URL="file:./data/app.db"; npm run db:generate
$env:DB_DRIVER="sqlite"; $env:DATABASE_URL="file:./data/app.db"; npm run db:migrate
$env:DB_DRIVER="sqlite"; $env:DATABASE_URL="file:./data/app.db"; npm run seed
npm run test -w @sem/api -- db
npm run typecheck -w @sem/api
```

Expected: migration files are created under `drizzle`, seed succeeds, database test passes, and typecheck passes.

- [ ] **Step 8: Commit database**

Run:

```bash
git add drizzle.config.ts drizzle apps/api/src/db apps/api/src/app.module.ts apps/api/src/testing apps/api/test/db.e2e-spec.ts package-lock.json
git commit -m "feat(api): add Drizzle database schema"
```

Expected: commit succeeds.

## Task 4: Authentication, RBAC, Users, and Settings

**Files:**
- Create: `apps/api/src/common/decorators/current-user.decorator.ts`
- Create: `apps/api/src/common/decorators/roles.decorator.ts`
- Create: `apps/api/src/common/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/common/guards/roles.guard.ts`
- Create: `apps/api/src/modules/auth/auth.module.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/users/users.module.ts`
- Create: `apps/api/src/modules/users/users.controller.ts`
- Create: `apps/api/src/modules/users/users.service.ts`
- Create: `apps/api/src/modules/user-settings/user-settings.module.ts`
- Create: `apps/api/src/modules/user-settings/user-settings.controller.ts`
- Create: `apps/api/src/modules/user-settings/user-settings.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/auth.e2e-spec.ts`

- [ ] **Step 1: Write auth tests**

Create `apps/api/test/auth.e2e-spec.ts` with tests proving:

- Seeded admin can log in at `POST /api/auth/login`.
- Admin can create ordinary users at `POST /api/admin/users`.
- Returned users never include `passwordHash`.
- Ordinary users receive 403 from admin routes.
- Ordinary users can update `baseCurrency`, `exchangeRateProvider`, and `dataSharingEnabled` at `PATCH /api/me/settings`.

Run:

```bash
npm run test -w @sem/api -- auth
```

Expected: fail because auth routes do not exist.

- [ ] **Step 2: Implement guards and decorators**

Implement:

```ts
export type AuthUser = { id: string; username: string; role: "admin" | "user"; status: "active" | "disabled" };
```

`CurrentUser` reads `request.user`. `Roles` stores role metadata. `JwtAuthGuard` verifies bearer tokens with `JwtService`, rejects disabled users, and attaches `AuthUser`. `RolesGuard` throws `ForbiddenException` when the current user does not match required roles.

- [ ] **Step 3: Implement auth routes**

Expose:

- `POST /api/auth/login`
- `GET /api/auth/me`

Login verifies `argon2` password hashes, updates `lastLoginAt`, and returns `{ accessToken, user }`.

- [ ] **Step 4: Implement admin user and settings routes**

Expose:

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id/status`
- `POST /api/admin/users/:id/reset-password`
- `GET /api/me/settings`
- `PATCH /api/me/settings`

Admin-created users must receive default `userSettings` with `baseCurrency = "CNY"`.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm run test -w @sem/api -- auth
npm run typecheck -w @sem/api
git add apps/api/src/common apps/api/src/modules/auth apps/api/src/modules/users apps/api/src/modules/user-settings apps/api/src/app.module.ts apps/api/test/auth.e2e-spec.ts
git commit -m "feat(api): add auth roles users and settings"
```

Expected: auth tests and typecheck pass, then commit succeeds.

## Task 5: Subscriptions, Version History, Expiration, and Auto-Renew

**Files:**
- Create: `apps/api/src/modules/subscriptions/subscriptions.module.ts`
- Create: `apps/api/src/modules/subscriptions/subscriptions.controller.ts`
- Create: `apps/api/src/modules/subscriptions/subscriptions.service.ts`
- Create: `apps/api/src/modules/subscriptions/billing-cycle.ts`
- Create: `apps/api/src/modules/subscriptions/auto-renew.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/subscriptions.e2e-spec.ts`

- [ ] **Step 1: Write subscription tests**

Create tests proving:

- Creating a subscription creates `subscriptionVersions.versionNumber = 1`.
- Updating monthly to yearly creates `versionNumber = 2`.
- Manually setting `status = "unavailable"` keeps `deletedAt = null`.
- An overdue non-auto-renew subscription becomes `expired`.
- An overdue auto-renew subscription stays `active`, advances `nextDueDate`, and creates a payment with `source = "auto_renewal"`.

Run:

```bash
npm run test -w @sem/api -- subscriptions
```

Expected: fail because subscription routes do not exist.

- [ ] **Step 2: Implement billing-cycle helper**

Create `billing-cycle.ts` with `advanceDueDate(date, cycle)` supporting `weekly`, `monthly`, `quarterly`, `yearly`, and `custom`. Treat `custom` as monthly in phase one.

- [ ] **Step 3: Implement subscription service and routes**

Expose:

- `GET /api/subscriptions`
- `POST /api/subscriptions`
- `GET /api/subscriptions/:id`
- `PATCH /api/subscriptions/:id`
- `DELETE /api/subscriptions/:id`
- `GET /api/subscriptions/:id/versions`

Rules:

- Scope all queries by current `userId`.
- `DELETE` sets `deletedAt` and increments `version`.
- Expiration and unavailable status never set `deletedAt`.
- Create and business-field updates write `subscriptionVersions`.

- [ ] **Step 4: Implement auto-renew service**

`processDueSubscriptions(now)` must:

- Find active due subscriptions.
- Mark non-auto-renew records `expired`.
- Roll auto-renew records forward.
- Create one automatic payment for the old period when missing.
- Use the current subscription price and currency.
- Store currency conversion fields with `exchangeRate = 1` until Task 6 wires real exchange rates.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm run test -w @sem/api -- subscriptions
npm run typecheck -w @sem/api
git add apps/api/src/modules/subscriptions apps/api/src/app.module.ts apps/api/test/subscriptions.e2e-spec.ts
git commit -m "feat(api): add subscriptions and auto renew"
```

Expected: subscription tests and typecheck pass, then commit succeeds.

## Task 6: Payments and Exchange Rates

**Files:**
- Create: `apps/api/src/modules/exchange-rates/exchange-rates.module.ts`
- Create: `apps/api/src/modules/exchange-rates/exchange-rates.controller.ts`
- Create: `apps/api/src/modules/exchange-rates/exchange-rates.service.ts`
- Create: `apps/api/src/modules/payments/payments.module.ts`
- Create: `apps/api/src/modules/payments/payments.controller.ts`
- Create: `apps/api/src/modules/payments/payments.service.ts`
- Modify: `apps/api/src/modules/subscriptions/auto-renew.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/payments.e2e-spec.ts`

- [ ] **Step 1: Write payment tests**

Create tests proving:

- User base currency defaults to CNY.
- Creating a USD payment calculates CNY `baseAmount` from cached rate.
- Manual `baseAmount` overrides conversion.
- Payment snapshots preserve linked subscription cycle and payment method.
- Auto-renew payments use exchange-rate snapshots after the service is wired.

Run:

```bash
npm run test -w @sem/api -- payments
```

Expected: fail because payment routes do not exist.

- [ ] **Step 2: Implement exchange-rate service**

Expose:

- `GET /api/exchange-rates?base=CNY&quote=USD`
- `POST /api/exchange-rates/refresh`

For provider `mock`, use deterministic rates:

```ts
export const mockRates: Record<string, number> = {
  "CNY:USD": 0.14,
  "USD:CNY": 7.1,
  "CNY:EUR": 0.13,
  "EUR:CNY": 7.8,
  "CNY:JPY": 21,
  "JPY:CNY": 0.048
};
```

Identical currencies return `1`. Non-identical currencies read or create today's `exchangeRates` row.

- [ ] **Step 3: Implement payment routes**

Expose:

- `GET /api/payments`
- `POST /api/payments`
- `GET /api/payments/:id`
- `PATCH /api/payments/:id`
- `DELETE /api/payments/:id`

Create rules:

- Resolve the user's `baseCurrency`.
- If `isBaseAmountManual = true`, use submitted `baseAmount`.
- Otherwise calculate `baseAmount = originalAmount * exchangeRate`.
- Copy subscription payment method and cycle into snapshots when linked.
- Soft delete with `deletedAt`.

- [ ] **Step 4: Wire exchange rates into auto-renew**

Automatic payments must use the owner's base currency, store the rate snapshot, and calculate `baseAmount`.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm run test -w @sem/api -- payments subscriptions
npm run typecheck -w @sem/api
git add apps/api/src/modules/exchange-rates apps/api/src/modules/payments apps/api/src/modules/subscriptions apps/api/src/app.module.ts apps/api/test/payments.e2e-spec.ts
git commit -m "feat(api): add payments and exchange rates"
```

Expected: payment and subscription tests pass, then commit succeeds.

## Task 7: Reminder Rules and Notification Channels

**Files:**
- Create: `apps/api/src/modules/notifications/notifications.module.ts`
- Create: `apps/api/src/modules/notifications/notifications.controller.ts`
- Create: `apps/api/src/modules/notifications/notifications.service.ts`
- Create: `apps/api/src/modules/notifications/channels.ts`
- Create: `apps/api/src/modules/reminders/reminders.module.ts`
- Create: `apps/api/src/modules/reminders/reminders.controller.ts`
- Create: `apps/api/src/modules/reminders/reminders.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/reminders.e2e-spec.ts`

- [ ] **Step 1: Write reminder and notification tests**

Create tests proving:

- Users can create global reminder rules.
- Users can create SMTP, Telegram, Webhook, Bark, ServerChan, and PushPlus channels.
- Test delivery writes `notificationLogs`.
- Reminder scan logs due reminders for subscriptions inside configured day windows.

Run:

```bash
npm run test -w @sem/api -- reminders
```

Expected: fail because routes do not exist.

- [ ] **Step 2: Implement notification adapters**

Create `channels.ts`:

```ts
export type NotificationPayload = { title: string; body: string };
export type NotificationResult = { ok: boolean; response: string; error: string };

export interface NotificationAdapter {
  send(config: Record<string, unknown>, payload: NotificationPayload): Promise<NotificationResult>;
}
```

Implement adapters for the six channel types. In non-production, adapters validate required config keys and return dry-run success. Keep production delivery behind the same interface.

- [ ] **Step 3: Implement routes**

Expose notification routes:

- `GET /api/notification-channels`
- `POST /api/notification-channels`
- `PATCH /api/notification-channels/:id`
- `DELETE /api/notification-channels/:id`
- `POST /api/notification-channels/:id/test`
- `GET /api/notification-logs`

Expose reminder routes:

- `GET /api/reminder-rules`
- `POST /api/reminder-rules`
- `PATCH /api/reminder-rules/:id`
- `DELETE /api/reminder-rules/:id`
- `POST /api/reminders/run`

- [ ] **Step 4: Implement scheduled scan**

Use `@nestjs/schedule`. Daily scan must:

- Find active subscriptions with `remindersEnabled = true`.
- Prefer subscription-specific rules over global rules.
- Write one notification log per due reminder event.
- Avoid duplicate user/subscription/rule/date logs.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm run test -w @sem/api -- reminders
npm run typecheck -w @sem/api
git add apps/api/src/modules/notifications apps/api/src/modules/reminders apps/api/src/app.module.ts apps/api/test/reminders.e2e-spec.ts
git commit -m "feat(api): add reminders and notification channels"
```

Expected: reminder tests and typecheck pass, then commit succeeds.

## Task 8: Admin Backups, Audit Logs, Shared Data, and System Status

**Files:**
- Create: `apps/api/src/modules/audit/audit.module.ts`
- Create: `apps/api/src/modules/audit/audit.service.ts`
- Create: `apps/api/src/modules/admin/admin.module.ts`
- Create: `apps/api/src/modules/admin/admin.controller.ts`
- Create: `apps/api/src/modules/admin/admin.service.ts`
- Create: `apps/api/src/modules/backups/backups.module.ts`
- Create: `apps/api/src/modules/backups/backups.controller.ts`
- Create: `apps/api/src/modules/backups/backups.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/admin.e2e-spec.ts`

- [ ] **Step 1: Write admin tests**

Create tests proving:

- Admin sees system status.
- Admin creates a backup record and file.
- Restore creates a pre-restore backup.
- Admin cannot read user subscriptions when `dataSharingEnabled = false`.
- Admin can read shared user data in read-only form when `dataSharingEnabled = true`.
- Shared-data reads write audit logs.

Run:

```bash
npm run test -w @sem/api -- admin
```

Expected: fail because admin modules do not exist.

- [ ] **Step 2: Implement audit service**

`AuditService.record(actorId, action, targetType, targetId, metadata)` writes `auditLogs`.

Use action strings:

- `admin.shared_data.view`
- `admin.backup.create`
- `admin.backup.restore`
- `admin.user.create`
- `admin.user.disable`
- `admin.user.reset_password`

- [ ] **Step 3: Implement backup routes**

Expose:

- `GET /api/admin/backups`
- `POST /api/admin/backups`
- `GET /api/admin/backups/:id/download`
- `POST /api/admin/backups/restore`

SQLite backup copies the database file into `BACKUP_DIR`. PostgreSQL backup creates a logical dump file through `pg_dump` when available; if unavailable, return a clear 503 error and write a failed backup record.

- [ ] **Step 4: Implement system and shared-data routes**

Expose:

- `GET /api/admin/system`
- `GET /api/admin/shared-users`
- `GET /api/admin/shared-users/:id/subscriptions`
- `GET /api/admin/shared-users/:id/payments`
- `GET /api/admin/audit-logs`

Shared-data routes must check `dataSharingEnabled = true`, never expose mutation controls, and write audit logs.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm run test -w @sem/api -- admin
npm run typecheck -w @sem/api
git add apps/api/src/modules/audit apps/api/src/modules/admin apps/api/src/modules/backups apps/api/src/app.module.ts apps/api/test/admin.e2e-spec.ts
git commit -m "feat(api): add admin backups audit and shared data"
```

Expected: admin tests and typecheck pass, then commit succeeds.

## Task 9: Mobile-Ready Sync API

**Files:**
- Create: `apps/api/src/modules/sync/sync.module.ts`
- Create: `apps/api/src/modules/sync/sync.controller.ts`
- Create: `apps/api/src/modules/sync/sync.service.ts`
- Modify: `apps/api/src/modules/subscriptions/subscriptions.service.ts`
- Modify: `apps/api/src/modules/payments/payments.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/sync.e2e-spec.ts`

- [ ] **Step 1: Write sync tests**

Create tests proving:

- Creating subscriptions and payments writes `syncEvents`.
- `GET /api/sync/pull` with no cursor returns events.
- Pulling again with the returned cursor returns no older events.
- `POST /api/sync/push` can update subscriptions and payments when client version is newer.
- Unsupported resources return 501 with a clear message.

Run:

```bash
npm run test -w @sem/api -- sync
```

Expected: fail because sync module does not exist.

- [ ] **Step 2: Implement sync service**

Expose:

- `GET /api/sync/pull?since=<iso-date>`
- `POST /api/sync/push`

Pull returns `{ cursor, events }`, where each event includes `resource`, `resourceId`, `operation`, `version`, `createdAt`, and current `data`.

Push supports `subscriptions` and `payments` in phase one. It uses last-write-wins when the incoming version is newer or equal.

- [ ] **Step 3: Record sync events from business services**

Subscription and payment create/update/delete paths must call sync recording with operation `created`, `updated`, or `deleted`.

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm run test -w @sem/api -- sync subscriptions payments
npm run typecheck -w @sem/api
git add apps/api/src/modules/sync apps/api/src/modules/subscriptions apps/api/src/modules/payments apps/api/src/app.module.ts apps/api/test/sync.e2e-spec.ts
git commit -m "feat(api): add sync API"
```

Expected: sync-related tests and typecheck pass, then commit succeeds.

## Task 10: Vue WebUI Shell and Login

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/main.ts`
- Create: `apps/web/src/App.vue`
- Create: `apps/web/src/router.ts`
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/stores/auth.ts`
- Create: `apps/web/src/styles/main.css`
- Create: `apps/web/src/components/AppShell.vue`
- Create: `apps/web/src/views/LoginView.vue`

- [ ] **Step 1: Create Vue package and build config**

Create `apps/web/package.json` with Vue, Vite, Pinia, Vue Router, TanStack Query, `vue-tsc`, and scripts `dev`, `build`, `test`, and `typecheck`.

Create Vite config with a dev proxy from `/api` to `http://localhost:3000`.

- [ ] **Step 2: Implement API client and auth store**

`apiFetch<T>(path, options)` must attach bearer token from localStorage, parse JSON, and throw response errors.

The Pinia auth store must expose `token`, `user`, `login`, `logout`, `loadMe`, and `isAdmin`.

- [ ] **Step 3: Implement routing and shell**

Routes:

- `/login`
- `/app`
- `/app/subscriptions`
- `/app/payments`
- `/app/calendar`
- `/app/notifications`
- `/app/settings`
- `/admin`
- `/admin/users`
- `/admin/backups`
- `/admin/system`
- `/admin/shared-data`
- `/admin/audit-logs`

Unauthenticated users redirect to `/login`. Admin routes require `role = admin`.

- [ ] **Step 4: Implement Clay-inspired CSS**

CSS requirements:

- Soft multi-color surfaces, not a one-hue theme.
- No decorative orbs.
- Cards use 8px radius or less.
- Sidebar and toolbar have stable dimensions.
- Mobile layout must not overlap text or controls.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm install
npm run build -w @sem/web
npm run typecheck -w @sem/web
git add apps/web package-lock.json
git commit -m "feat(web): add Vue shell and login"
```

Expected: WebUI builds and typechecks, then commit succeeds.

## Task 11: Ordinary User Web Pages

**Files:**
- Create: `apps/web/src/api/queries.ts`
- Create: `apps/web/src/components/EmptyState.vue`
- Create: `apps/web/src/components/StatCard.vue`
- Create: `apps/web/src/components/StatusBadge.vue`
- Create: `apps/web/src/views/user/DashboardView.vue`
- Create: `apps/web/src/views/user/SubscriptionsView.vue`
- Create: `apps/web/src/views/user/PaymentsView.vue`
- Create: `apps/web/src/views/user/CalendarView.vue`
- Create: `apps/web/src/views/user/NotificationsView.vue`
- Create: `apps/web/src/views/user/SettingsView.vue`
- Modify: `apps/web/src/router.ts`

- [ ] **Step 1: Add user query helpers**

Add typed wrappers for subscriptions, payments, exchange rates, reminder rules, notification channels, notification logs, and settings.

- [ ] **Step 2: Implement Dashboard**

Dashboard shows monthly base-currency spend, upcoming renewals, yearly trend, category breakdown, active subscriptions, and empty states.

- [ ] **Step 3: Implement Subscriptions**

Subscriptions page supports list, filter, create, edit, soft delete, manual `expired/unavailable`, auto-renew switch, reminder state, and version history.

- [ ] **Step 4: Implement Payments**

Payments page supports ledger list, create/edit form, original amount/currency, exchange-rate preview, manual base amount override, and linked subscription selector.

- [ ] **Step 5: Implement Calendar, Notifications, and Settings**

Calendar shows renewal dates. Notifications manage rules, six channel types, tests, and logs. Settings manage base currency, exchange provider, data-sharing switch, and password reset note.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm run build -w @sem/web
npm run typecheck -w @sem/web
git add apps/web/src
git commit -m "feat(web): add user workspace"
```

Expected: WebUI builds and typechecks, then commit succeeds.

## Task 12: Admin Web Pages

**Files:**
- Create: `apps/web/src/views/admin/UsersView.vue`
- Create: `apps/web/src/views/admin/BackupsView.vue`
- Create: `apps/web/src/views/admin/SystemView.vue`
- Create: `apps/web/src/views/admin/SharedDataView.vue`
- Create: `apps/web/src/views/admin/AuditLogsView.vue`
- Modify: `apps/web/src/api/queries.ts`
- Modify: `apps/web/src/router.ts`

- [ ] **Step 1: Add admin query helpers**

Add typed wrappers for user management, backups, system status, shared users, shared subscriptions/payments, and audit logs.

- [ ] **Step 2: Implement Users page**

Users page supports listing, creating, disabling, reset password, role display, status display, and data-sharing state display.

- [ ] **Step 3: Implement Backups page**

Backups page supports create backup, list backups, download backup, upload restore file, and restore warning.

- [ ] **Step 4: Implement System and Audit pages**

System page shows database type, app version, storage path, latest backup, reminder job state, notification failures, and user count. Audit page lists actor, action, target, metadata summary, and time.

- [ ] **Step 5: Implement Shared Data page**

Shared Data lists only users with `dataSharingEnabled = true` and shows subscriptions/payments read-only with no edit/delete controls.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm run build -w @sem/web
npm run typecheck -w @sem/web
git add apps/web/src
git commit -m "feat(web): add admin workspace"
```

Expected: WebUI builds and typechecks, then commit succeeds.

## Task 13: Docker, Static Serving, and Deployment Docs

**Files:**
- Create: `.dockerignore`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `docs/deployment.md`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Add production static serving**

Modify `apps/api/src/main.ts` so production serves `apps/web/dist` at `/` while keeping APIs under `/api`.

- [ ] **Step 2: Add Dockerfile**

Use a multi-stage Dockerfile:

- `deps`: install workspace dependencies with `npm ci`.
- `build`: copy source and run `npm run build`.
- `runtime`: copy API dist, Web dist, shared dist, migrations, package files, and `node_modules`.
- command: `node apps/api/dist/main.js`.

- [ ] **Step 3: Add Docker Compose**

Default `docker-compose.yml`:

- `app` service exposes `3000:3000`.
- `DB_DRIVER=sqlite`.
- `DATABASE_URL=file:/data/app.db`.
- volumes `sem-data:/data` and `sem-backups:/backups`.

PostgreSQL profile:

- `postgres` service using `postgres:16-alpine`.
- profile name `postgres`.
- volume `sem-postgres:/var/lib/postgresql/data`.
- app can be switched by setting `DB_DRIVER=postgres` and `DATABASE_URL=postgres://sem:sem@postgres:5432/sem`.

- [ ] **Step 4: Add deployment docs**

`docs/deployment.md` must include:

- SQLite command: `docker compose up -d --build`.
- PostgreSQL command: `docker compose --profile postgres up -d --build`.
- Required production env changes: `JWT_SECRET`, admin password, `APP_URL`.
- Backup volume explanation.

- [ ] **Step 5: Verify and commit**

Run:

```bash
docker compose build
git add .dockerignore Dockerfile docker-compose.yml docs/deployment.md apps/api/src/main.ts
git commit -m "chore: add Docker deployment"
```

Expected: Docker image builds and commit succeeds.

## Task 14: Final Verification and Project README

**Files:**
- Create: `README.md`
- Modify: `.env.example`
- Modify: files found by verification failures only

- [ ] **Step 1: Write README**

README must include:

- project summary,
- current first-phase scope,
- local development commands,
- Docker commands,
- default admin setup warning,
- SQLite/PostgreSQL notes,
- mobile offline-first future note.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run build
npm run typecheck
npm run test
docker compose build
```

Expected: all commands pass.

- [ ] **Step 3: Browser smoke test**

Start API and WebUI:

```bash
$env:DB_DRIVER="sqlite"; $env:DATABASE_URL="file:./data/app.db"; npm run dev -w @sem/api
npm run dev:web
```

Open `http://localhost:5173` and verify:

- login page renders on desktop and mobile widths without overlap,
- admin login succeeds,
- admin users page loads,
- ordinary user can be created,
- ordinary user can create a subscription,
- auto-renew switch is visible,
- payment form includes original currency and base-currency fields,
- settings include base currency and data-sharing switch.

- [ ] **Step 4: Commit final docs**

Run:

```bash
git add README.md .env.example
git status --short
git commit -m "docs: add project usage guide"
```

Expected: commit succeeds and repository contains a working first-phase implementation.

## Plan Review Checklist

- Spec coverage:
  - Dockerized NestJS API: Tasks 2, 3, 13.
  - Vue 3 WebUI: Tasks 10, 11, 12.
  - SQLite default and PostgreSQL profile: Tasks 3, 13.
  - Admin-managed accounts: Task 4.
  - Subscriptions, history, expiration, unavailable, auto-renew: Task 5.
  - Payments and exchange rates: Task 6.
  - Reminder rules and notification channels: Task 7.
  - Backups, admin system status, audit logs, shared-data read-only access: Task 8.
  - Sync API for later mobile clients: Task 9.
  - Final verification: Task 14.
- Red-flag scan:
  - Drizzle is used because the approved deployment requires SQLite by default and PostgreSQL as an optional runtime profile.
- Type consistency:
  - Shared enum values match database text values.
  - `autoRenew`, `expired`, `unavailable`, `baseCurrency`, `dataSharingEnabled`, and `auto_renewal` are used consistently.
  - API routes consistently use `/api`.

