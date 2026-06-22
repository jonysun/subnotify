import { Controller, Get, Inject, Param, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";
import { AdminService } from "./admin.service.js";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @Get("system")
  system() { return this.admin.system(); }

  @Get("shared-users")
  sharedUsers() { return this.admin.sharedUsers(); }

  @Get("shared-users/:id/subscriptions")
  sharedSubscriptions(@CurrentUser() user: AuthUser, @Param("id") id: string) { return this.admin.sharedSubscriptions(user, id); }

  @Get("shared-users/:id/payments")
  sharedPayments(@CurrentUser() user: AuthUser, @Param("id") id: string) { return this.admin.sharedPayments(user, id); }

  @Get("audit-logs")
  auditLogs() { return this.admin.auditLogs(); }
}