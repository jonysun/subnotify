# Docker Deployment

This phase ships a single Docker image that serves the NestJS API and the built Vue WebUI from port `3000`.

## SQLite Deployment

```bash
docker compose up -d --build
```

The default compose file uses SQLite with `DATABASE_URL=file:/data/app.db`. The database is stored in the `sem-data` volume, and backups are stored in the `sem-backups` volume mounted at `/backups`.

On first start, the container runs the seed script before the API starts. If the configured initial admin does not exist, it creates one using `INITIAL_ADMIN_USERNAME`, `INITIAL_ADMIN_PASSWORD`, and `INITIAL_ADMIN_DISPLAY_NAME`.

## Required Production Changes

Before exposing the service, change these values in `docker-compose.yml` or an override file:

- `JWT_SECRET`: use a long random secret.
- `INITIAL_ADMIN_PASSWORD`: replace the default `admin123456` before first start.
- `APP_URL`: set the public URL users will access.
- `CORS_ORIGIN`: set the same public origin unless a separate trusted origin is required.

## PostgreSQL Profile

The compose file includes a PostgreSQL service profile for the planned PostgreSQL backend:

```bash
docker compose --profile postgres up -d --build
```

Important: the current API still intentionally enables only SQLite at runtime. Setting `DB_DRIVER=postgres` will start the PostgreSQL container but the API will reject PostgreSQL until the server-side PostgreSQL driver and migrations are completed.

## Backups

Admin backup creation currently supports SQLite. Backup metadata is stored in the app database and backup files are written to `BACKUP_DIR`, which defaults to `/backups` in Docker. Keep both `sem-data` and `sem-backups` in your normal server backup plan.
