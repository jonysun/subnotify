import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { RemindersService } from "./reminders.service.js";

const runSchema = z.object({ now: z.string().datetime().optional() });

@Controller()
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(@Inject(RemindersService) private readonly reminders: RemindersService) {}

  @Get("reminder-rules")
  list(@CurrentUser() user: AuthUser) {
    return this.reminders.list(user);
  }

  @Post("reminder-rules")
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.reminders.create(user, this.reminders.parseCreate(body));
  }

  @Patch("reminder-rules/:id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    return this.reminders.update(user, id, this.reminders.parseUpdate(body));
  }

  @Delete("reminder-rules/:id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.reminders.delete(user, id);
  }

  @Get("subscriptions/:id/reminders")
  listForSubscription(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.reminders.listForSubscription(user, id);
  }

  @Post("subscriptions/:id/reminders")
  replaceForSubscriptionPost(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    return this.reminders.replaceForSubscription(user, id, this.reminders.parseReplaceSubscriptionRules(body));
  }

  @Patch("subscriptions/:id/reminders")
  replaceForSubscriptionPatch(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    return this.reminders.replaceForSubscription(user, id, this.reminders.parseReplaceSubscriptionRules(body));
  }

  @Put("subscriptions/:id/reminders")
  replaceForSubscription(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    return this.reminders.replaceForSubscription(user, id, this.reminders.parseReplaceSubscriptionRules(body));
  }

  @Post("reminders/run")
  run(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = runSchema.parse(body ?? {});
    return this.reminders.run(user, input.now ? new Date(input.now) : new Date());
  }
}
