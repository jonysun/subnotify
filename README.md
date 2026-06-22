# Subscription Expense Manager

A self-hosted subscription and expense manager with a NestJS API, Vue WebUI, SQLite storage, optional sync APIs for future mobile clients, admin account management, backups, reminders, and read-only shared-data review.

## Current Scope

This repository currently implements the first deployable server phase:

- NestJS API with JWT login, admin/user roles, user settings, subscriptions, payments, exchange-rate snapshots, reminder rules, notification channels, audit logs, backups, and sync endpoints.
- Vue 3 WebUI for ordinary users to manage subscriptions, payments, renewal calendar, notifications, and settings.
- Vue 3 admin workspace for users, backups, system status, shared user data, and audit logs.
- Docker image and Compose deployment for SQLite.

Native iOS SwiftUI and Android clients are planned next. The API already includes sync endpoints so mobile apps can support local/offline-first storage and optional server synchronization.

## Local Development

Install dependencies:

```bash
npm install
```

Create a local environment file from `.env.example`, then start the API and WebUI in separate terminals:

```bash
npm run dev
npm run dev:web
```

Default local URLs:

- API: `http://localhost:3000/api`
- Swagger docs: `http://localhost:3000/api/docs`
- WebUI: `http://localhost:5173`

Seed the initial admin account when needed:

```bash
npm run seed
```

Default development admin credentials are `admin` / `admin123456`. Change them before any real deployment.

## Verification

```bash
npm run build
npm run typecheck
npm run test
```

## Docker

Build and run the SQLite deployment:

```bash
docker compose up -d --build
```

The container serves both API and WebUI on `http://localhost:3000`. It runs the seed script before startup and creates the initial admin account if it does not exist.

Production values to change before first start:

- `JWT_SECRET`
- `INITIAL_ADMIN_PASSWORD`
- `APP_URL`
- `CORS_ORIGIN`

Persistent volumes:

- `sem-data`: SQLite database at `/data/app.db`
- `sem-backups`: admin-created backup files at `/backups`

## Database Notes

SQLite is the working default and the supported Docker deployment in this phase. A PostgreSQL service profile is included in `docker-compose.yml` for the planned backend, but the current API intentionally rejects `DB_DRIVER=postgres` until PostgreSQL migrations and runtime support are completed.

## Mobile Roadmap

The mobile apps should keep a local database first and operate offline without the server. When users enable cloud sync, the app will store the server URL, username, and password, then use the sync API to push/pull changes. Local system notifications remain available without server sync; calendar/ICS integration and alarm-style reminders belong in the native app layer.
