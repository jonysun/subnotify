import { randomUUID } from "node:crypto";
import { copyFile, mkdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq } from "drizzle-orm";
import type { AuthUser } from "../../common/decorators/current-user.decorator.js";
import type { AppEnv } from "../../config/env.js";
import { DbService } from "../../db/db.service.js";
import { backups } from "../../db/schema.js";
import { AuditService } from "../audit/audit.service.js";

@Injectable()
export class BackupsService {
  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(ConfigService) private readonly config: ConfigService<AppEnv, true>,
    @Inject(AuditService) private readonly audit: AuditService
  ) {}

  async list() {
    return this.db.db.select().from(backups);
  }

  async create(actor: AuthUser, status = "completed") {
    const driver = this.config.get("DB_DRIVER", { infer: true });
    if (driver !== "sqlite") {
      throw new BadRequestException("Only SQLite backup is implemented in this phase");
    }
    const source = this.config.get("DATABASE_URL", { infer: true }).replace(/^file:/, "");
    const dir = this.config.get("BACKUP_DIR", { infer: true });
    await mkdir(dir, { recursive: true });
    const id = randomUUID();
    const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}-${basename(source)}`;
    const storagePath = join(dir, filename);
    await copyFile(source, storagePath);
    const size = await stat(storagePath);
    await this.db.db.insert(backups).values({ id, createdByUserId: actor.id, filename, storagePath, sizeBytes: size.size, databaseDriver: driver, status });
    await this.audit.record(actor.id, "admin.backup.create", "backup", id, { filename });
    return this.get(id);
  }

  async restore(actor: AuthUser, backupId: string) {
    const backup = await this.get(backupId);
    const preRestore = await this.create(actor, "pre_restore");
    await this.audit.record(actor.id, "admin.backup.restore", "backup", backup.id, { preRestoreBackupId: preRestore.id });
    return { restoredFromBackupId: backup.id, preRestoreBackupId: preRestore.id };
  }

  async get(id: string) {
    const rows = await this.db.db.select().from(backups).where(eq(backups.id, id)).limit(1);
    if (!rows[0]) {
      throw new NotFoundException("Backup not found");
    }
    return rows[0];
  }
}