import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module.js";
import { AuditModule } from "../audit/audit.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { BackupsController } from "./backups.controller.js";
import { BackupsService } from "./backups.service.js";

@Module({ imports: [AuthModule, DbModule, AuditModule], controllers: [BackupsController], providers: [BackupsService], exports: [BackupsService] })
export class BackupsModule {}