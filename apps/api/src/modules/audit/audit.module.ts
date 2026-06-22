import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module.js";
import { AuditService } from "./audit.service.js";

@Module({ imports: [DbModule], providers: [AuditService], exports: [AuditService] })
export class AuditModule {}