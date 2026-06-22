import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { SyncController } from "./sync.controller.js";
import { SyncService } from "./sync.service.js";

@Module({ imports: [AuthModule, DbModule], controllers: [SyncController], providers: [SyncService], exports: [SyncService] })
export class SyncModule {}