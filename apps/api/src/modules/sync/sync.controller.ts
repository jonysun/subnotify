import { Body, Controller, Get, Inject, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { SyncService } from "./sync.service.js";

@Controller("sync")
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(@Inject(SyncService) private readonly sync: SyncService) {}

  @Get("pull")
  pull(@CurrentUser() user: AuthUser, @Query("since") since?: string) { return this.sync.pull(user, since); }

  @Post("push")
  push(@CurrentUser() user: AuthUser, @Body() body: unknown) { return this.sync.push(user, this.sync.parsePush(body)); }
}