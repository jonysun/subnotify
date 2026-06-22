import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";

@Module({
  imports: [AuthModule, DbModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}