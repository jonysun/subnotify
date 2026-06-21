import { Module } from "@nestjs/common";
import { AppConfigModule } from "./config/app-config.module.js";
import { DbModule } from "./db/db.module.js";
import { HealthModule } from "./modules/health/health.module.js";

@Module({ imports: [AppConfigModule, DbModule, HealthModule] })
export class AppModule {}
