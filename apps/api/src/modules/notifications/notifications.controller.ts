import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { NotificationsService } from "./notifications.service.js";

@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}

  @Get("notification-channels")
  listChannels(@CurrentUser() user: AuthUser) {
    return this.notifications.listChannels(user);
  }

  @Post("notification-channels")
  createChannel(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.notifications.createChannel(user, this.notifications.parseCreate(body));
  }

  @Patch("notification-channels/:id")
  updateChannel(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    return this.notifications.updateChannel(user, id, this.notifications.parseUpdate(body));
  }

  @Delete("notification-channels/:id")
  deleteChannel(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.notifications.deleteChannel(user, id);
  }

  @Post("notification-channels/:id/test")
  testChannel(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.notifications.testChannel(user, id);
  }

  @Get("notification-logs")
  listLogs(@CurrentUser() user: AuthUser) {
    return this.notifications.listLogs(user);
  }
}