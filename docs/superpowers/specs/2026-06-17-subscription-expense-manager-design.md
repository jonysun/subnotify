# Subscription and Expense Manager Design

## Status

Approved for first-phase design by the user on 2026-06-17.

## Goal

Build a self-hosted subscription and expense management platform with a Docker deployment, a web management UI, and APIs designed for future native Android and iOS clients.

The first phase delivers the server, Docker packaging, and WebUI. Native mobile apps are designed for but not implemented in this phase.

## References

- `wangwangit/SubsTracker`: multi-level and multi-channel reminder ideas.
- `ketanchoyal/Sub-Track`: mobile-first subscription management UI direction for later Android and iOS apps.
- `ieax/renewhelper`: broad self-hosted feature set, including Docker deployment, bill management, reminders, calendar-oriented renewal handling, and backup-style operations.
- `getdesign.md/clay/design-md`: WebUI visual inspiration.

## First-Phase Scope

The first phase implements:

- NestJS backend with the Fastify adapter.
- Vue 3 WebUI.
- Docker Compose deployment.
- SQLite as the default database.
- Optional PostgreSQL deployment through a Compose profile.
- Admin-managed accounts with no public registration.
- User subscription records, subscription history, payment records, reminder rules, notification channels, statistics, and settings.
- Admin user management, backup and restore, system status, audit logs, and shared-data read-only views.
- Multi-channel server notifications.
- Exchange-rate fetching and payment currency conversion.
- API contracts and database fields required for later mobile offline-first sync.

The first phase does not implement native Android or iOS apps.

## Architecture

The backend is a TypeScript NestJS application using the Fastify adapter. It exposes REST APIs, OpenAPI documentation, JWT-based authentication, role-based authorization, scheduled jobs, backup and restore operations, exchange-rate operations, and notification delivery.

The WebUI is a Vue 3 and Vite application written in TypeScript. The production Docker image serves the built WebUI from the backend service.

The default Docker Compose deployment runs a single app service with a SQLite database stored in a persistent volume. A PostgreSQL Compose profile adds a database container and switches the backend connection through environment variables.

The future mobile clients support two modes:

- Local-only mode: data is stored only in the app's local database. No server URL, account, or password is required.
- Cloud-sync mode: the user configures a server URL, username, and password. The app keeps a local database, works offline, and syncs changes when the server is reachable.

Mobile reminders are not dependent on server notifications. Local-only and offline mobile reminders use OS features such as local notifications, calendar or ICS integration, and available platform alarm capabilities.

## Accounts and Permissions

Public registration is disabled.

The system creates an initial admin account during setup. After setup, admins create, disable, and reset accounts for ordinary users.

Roles:

- `admin`: manages users, backups, system status, global settings, audit logs, and shared-data read-only views.
- `user`: manages only their own subscriptions, payments, categories, tags, reminders, notification channels, statistics, and settings.

Admins cannot view ordinary users' business records by default.

Each user has a `dataSharingEnabled` setting. When enabled, admins can view that user's subscriptions, payments, statistics, reminder logs, and related business data in read-only mode. Admins still cannot edit shared user data. Shared-data access is recorded in audit logs.

## Data Model

### Users

`users` stores account identity and authorization data:

- `id`
- `username`
- `displayName`
- `passwordHash`
- `role`
- `status`
- `dataSharingEnabled`
- `createdAt`
- `updatedAt`
- `lastLoginAt`

### User Settings

`user_settings` stores per-user preferences:

- `id`
- `userId`
- `baseCurrency`, default `CNY`
- `exchangeRateAutoUpdateEnabled`
- `exchangeRateProvider`
- `createdAt`
- `updatedAt`

### Subscriptions

`subscriptions` stores the current subscription record:

- `id`
- `userId`
- `name`
- `siteUrl`
- `paymentMethod`
- `currentCycle`
- `currentPrice`
- `currentCurrency`
- `startDate`
- `endDate`
- `nextDueDate`
- `status`
- `autoRenew`
- `categoryId`
- `notes`
- `remindersEnabled`
- `createdAt`
- `updatedAt`
- `deletedAt`
- `version`

Subscription status includes:

- `active`
- `expired`
- `paused`
- `cancelled`
- `unavailable`

Expired subscriptions are not deleted. When a subscription reaches its due date and is not auto-renewed, the system marks it as `expired`. Users can also manually mark a subscription as expired or unavailable.

`deletedAt` is reserved for explicit user deletion and for sync propagation. It is not used for normal expiration.

### Auto-Renew Semantics

Each subscription has an `autoRenew` switch.

When `autoRenew` is enabled, the scheduled billing job treats the subscription as continuing after each due date. At renewal time the system:

- keeps the subscription `active`,
- advances `nextDueDate` by the configured payment cycle,
- extends the relevant coverage period,
- creates an automatic payment record from the current subscription price and currency unless a matching payment for that period already exists,
- stores the exchange-rate snapshot and base-currency amount for that automatic payment,
- records the payment source as `auto_renewal`,
- writes notification and audit metadata as needed.

This means users do not need to manually enter a payment record for ordinary recurring renewals. They can still edit or delete an automatic payment later if the real-world charge differs.

When `autoRenew` is disabled, the subscription does not roll forward automatically. If the due date passes without renewal, the scheduled job marks it as `expired`.

### Subscription Versions

`subscription_versions` records historical changes to subscription configuration:

- `id`
- `subscriptionId`
- `userId`
- `versionNumber`
- `changedAt`
- `changedBy`
- `changeReason`
- `name`
- `siteUrl`
- `paymentMethod`
- `cycle`
- `price`
- `currency`
- `startDate`
- `endDate`
- `nextDueDate`
- `status`
- `autoRenew`
- `notes`

This table preserves changes such as monthly to yearly billing, price changes, payment-method changes, pauses, resumes, cancellations, manual expirations, and URL changes.

### Payments

`payments` records actual spending:

- `id`
- `userId`
- `subscriptionId`
- `paidAt`
- `periodStart`
- `periodEnd`
- `originalAmount`
- `originalCurrency`
- `exchangeRate`
- `baseAmount`
- `baseCurrency`
- `rateSource`
- `rateDate`
- `isBaseAmountManual`
- `paymentMethodSnapshot`
- `cycleSnapshot`
- `source`
- `notes`
- `createdAt`
- `updatedAt`
- `deletedAt`
- `version`

`source` includes values such as:

- `manual`
- `auto_renewal`
- `imported`

Payment rows preserve the subscription state at the time of payment through snapshot fields. Historical payment reports must not change when the subscription is later edited.

### Exchange Rates

`exchange_rates` caches exchange rates:

- `id`
- `baseCurrency`
- `quoteCurrency`
- `rate`
- `provider`
- `fetchedAt`
- `validForDate`

When a user records a payment in a non-base currency, the backend can fetch or reuse an exchange rate and calculate `baseAmount`. Users can manually override the base-currency amount. Payments store a rate snapshot so historical totals remain stable after rates change.

### Supporting Tables

Additional tables:

- `categories`
- `tags`
- `subscription_tags`
- `reminder_rules`
- `notification_channels`
- `notification_logs`
- `sync_events`
- `backups`
- `audit_logs`

## Sync Design

The server is authoritative in cloud-sync mode.

Primary business tables include:

- `createdAt`
- `updatedAt`
- `deletedAt`
- `version`

Mobile clients keep a compatible local database. They can operate entirely offline. In cloud-sync mode they push local changes to the server and pull remote changes using a `since` cursor.

The first conflict strategy is last-write-wins based on version and update time. Conflicts are logged so later versions of the WebUI or mobile clients can expose conflict resolution if needed.

Deletes use soft deletion through `deletedAt` so all clients can receive deletion events.

The server exposes sync endpoints for subscriptions, subscription versions, payments, categories, tags, reminder rules, notification settings, user settings, and exchange-rate metadata relevant to local display.

## Reminders and Notifications

Users can define global reminder rules and subscription-specific overrides.

Reminder examples:

- 30 days before due date.
- 7 days before due date.
- 3 days before due date.
- 1 day before due date.
- On due date.
- After overdue.

The backend runs scheduled jobs to calculate reminder events from subscription due dates, cycles, status, auto-renew settings, and payment history.

First-phase notification channels:

- Email SMTP
- Telegram Bot
- Webhook
- Bark
- ServerChan
- PushPlus

Users manage their own notification channels and can send test notifications. Every delivery attempt is recorded in `notification_logs`, including the channel, target subscription, triggering rule, status, error message, and response summary.

Server notifications apply to cloud/server data. Future local-only mobile reminders use Android and iOS system capabilities instead.

## Backup and Restore

Only admins can operate backups.

Backup features:

- Manual backup.
- Scheduled backup.
- Retention count configuration.
- Backup download.
- Backup upload and restore.
- Restore-preflight validation.
- Automatic pre-restore backup.

SQLite backups copy and package the database file and required app metadata. PostgreSQL backups use database dumps. Backup metadata is stored in `backups`, including creator, type, path, size, status, created time, and errors.

## WebUI Design

The WebUI uses a Clay-inspired administration style: soft color surfaces, gentle organic corners, subtle depth, and polished empty states. It remains a practical management interface with dense lists, filters, tables, charts, and fast forms.

There is no marketing landing page. After login, users enter the correct workspace for their role.

### Ordinary User Pages

- Dashboard: monthly spend, upcoming renewals, yearly trend, category breakdown, currency-converted totals.
- Subscriptions: list, filters, status, next due date, auto-renew switch, reminders, details, and version history.
- Payments: payment ledger, foreign-currency input, exchange-rate conversion, manual base-currency override, import and export.
- Calendar: renewal calendar. Future versions may support ICS export.
- Notifications: reminder rules, notification channels, test delivery, and logs.
- Settings: base currency, exchange-rate options, data-sharing switch, password, and sync instructions.

### Admin Pages

- Users: create users, disable users, reset passwords, inspect roles and data-sharing state.
- Backups: manual backup, scheduled backup settings, download, upload, and restore.
- System: database type, app version, storage path, latest backup, reminder job state, notification failures, and user count.
- Shared Data: read-only access to users who enabled data sharing.
- Audit Logs: account operations, backup and restore actions, admin shared-data access, and other sensitive operations.

## Docker Deployment

Default deployment:

- One app container.
- SQLite database in a persistent volume.
- Persistent backup directory.
- Environment variables for initial admin account, JWT secret, database connection, backup directory, app URL, and optional exchange-rate provider settings.

PostgreSQL deployment:

- Enabled through a Docker Compose profile.
- Adds a PostgreSQL container.
- Switches the backend to PostgreSQL through environment variables.

## Non-Goals for Phase One

- Native Android app implementation.
- Native iOS SwiftUI app implementation.
- Public registration.
- Remote backup targets such as S3, WebDAV, or Alist.
- Full manual conflict-resolution UI.
- Admin write access to ordinary users' shared business data.

## Verification Goals

The first implementation phase should be considered complete when:

- A new self-hosted deployment can start with Docker Compose and SQLite.
- A PostgreSQL profile can start successfully.
- The initial admin can create ordinary users.
- Ordinary users can manage subscriptions, subscription versions, payments, categories, tags, reminders, notification channels, exchange-rate settings, and base currency.
- Expired subscriptions remain visible and are not deleted.
- Auto-renew subscriptions roll forward and create automatic payment records.
- Manual and automatic payments preserve currency-conversion snapshots.
- Admins cannot view user business data unless data sharing is enabled.
- Admin shared-data access is read-only and audited.
- Backups can be created, downloaded, uploaded, and restored.
- Notification test delivery and scheduled reminder logs work for all first-phase channels.
- OpenAPI documents the sync endpoints needed by later native apps.
