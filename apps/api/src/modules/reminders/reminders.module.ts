import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DbModule } from "../../db/db.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { RemindersController } from "./reminders.controller.js";
import { RemindersService } from "./reminders.service.js";

@Module({
  imports: [AuthModule, DbModule, NotificationsModule, ScheduleModule.forRoot()],
  controllers: [RemindersController],
  providers: [RemindersService],
  exports: [RemindersService]
})
export class RemindersModule {}