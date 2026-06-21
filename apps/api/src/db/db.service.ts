import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { AppEnv } from "../config/env.js";
import { migrateSqlite } from "./migrations.js";
import * as schema from "./schema.js";

export type AppDatabase = ReturnType<typeof drizzleSqlite<typeof schema>>;

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly sqlite?: Database.Database;
  readonly db: AppDatabase;

  constructor(@Inject(ConfigService) config: ConfigService<AppEnv, true>) {
    const driver = config.get("DB_DRIVER", { infer: true });
    const url = config.get("DATABASE_URL", { infer: true });

    if (driver === "postgres") {
      throw new Error("PostgreSQL is planned for the Docker profile but is not enabled in this phase yet.");
    }

    const filename = url.replace(/^file:/, "");
    mkdirSync(dirname(filename), { recursive: true });
    this.sqlite = new Database(filename);
    migrateSqlite(this.sqlite);
    this.db = drizzleSqlite(this.sqlite, { schema });
  }

  async onModuleDestroy() {
    this.sqlite?.close();
  }
}
