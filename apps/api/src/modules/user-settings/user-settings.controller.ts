import { Body, Controller, Get, Inject, Patch, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { UserSettingsService } from "./user-settings.service.js";

const updateSettingsSchema = z.object({
  baseCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
  exchangeRateProvider: z.string().trim().min(1).max(80).optional(),
  dataSharingEnabled: z.boolean().optional()
});

@Controller("me/settings")
@UseGuards(JwtAuthGuard)
export class UserSettingsController {
  constructor(@Inject(UserSettingsService) private readonly settings: UserSettingsService) {}

  @Get()
  getSettings(@CurrentUser() user: AuthUser) {
    return this.settings.getSettings(user);
  }

  @Patch()
  updateSettings(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.settings.updateSettings(user, updateSettingsSchema.parse(body));
  }
}
