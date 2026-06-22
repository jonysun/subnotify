import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module.js";
import { AuditModule } from "../audit/audit.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AdminController } from "./admin.controller.js";
import { AdminService } from "./admin.service.js";

@Module({ imports: [AuthModule, DbModule, AuditModule], controllers: [AdminController], providers: [AdminService], exports: [AdminService] })
export class AdminModule {}