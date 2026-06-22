import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { UserSettingsController } from "./user-settings.controller.js";
import { UserSettingsService } from "./user-settings.service.js";

@Module({
  imports: [AuthModule, DbModule],
  controllers: [UserSettingsController],
  providers: [UserSettingsService],
  exports: [UserSettingsService]
})
export class UserSettingsModule {}
