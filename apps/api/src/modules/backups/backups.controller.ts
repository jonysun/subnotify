import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";
import { BackupsService } from "./backups.service.js";

const restoreSchema = z.object({ backupId: z.string().uuid() });

@Controller("admin/backups")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class BackupsController {
  constructor(@Inject(BackupsService) private readonly backups: BackupsService) {}

  @Get()
  list() { return this.backups.list(); }

  @Post()
  create(@CurrentUser() user: AuthUser) { return this.backups.create(user); }

  @Get(":id/download")
  download(@Param("id") id: string) { return this.backups.get(id); }

  @Post("restore")
  restore(@CurrentUser() user: AuthUser, @Body() body: unknown) { return this.backups.restore(user, restoreSchema.parse(body).backupId); }
}