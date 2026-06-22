import { Module } from "@nestjs/common";
import { AppConfigModule } from "./config/app-config.module.js";
import { DbModule } from "./db/db.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { ExchangeRatesModule } from "./modules/exchange-rates/exchange-rates.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { PaymentsModule } from "./modules/payments/payments.module.js";
import { RemindersModule } from "./modules/reminders/reminders.module.js";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module.js";
import { UserSettingsModule } from "./modules/user-settings/user-settings.module.js";
import { UsersModule } from "./modules/users/users.module.js";

@Module({
  imports: [
    AppConfigModule,
    DbModule,
    HealthModule,
    AuthModule,
    UsersModule,
    UserSettingsModule,
    SubscriptionsModule,
    ExchangeRatesModule,
    PaymentsModule,
    NotificationsModule,
    RemindersModule
  ]
})
export class AppModule {}