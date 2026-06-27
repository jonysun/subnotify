import { randomUUID } from "node:crypto";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { AuthUser } from "../../common/decorators/current-user.decorator.js";
import { DbService } from "../../db/db.service.js";
import { notificationChannels, notificationLogs } from "../../db/schema.js";
import { getNotificationAdapter, type NotificationPayload } from "./channels.js";

const channelTypes = ["smtp", "telegram", "webhook", "wechatbot", "email", "bark", "gotify", "serverchan", "pushplus", "notifyx"] as const;
const createChannelSchema = z.object({
  type: z.enum(channelTypes),
  name: z.string().trim().min(1).max(120),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown())
});
const updateChannelSchema = createChannelSchema.partial();

type CreateChannelInput = z.infer<typeof createChannelSchema>;
type UpdateChannelInput = z.infer<typeof updateChannelSchema>;

@Injectable()
export class NotificationsService {
  constructor(@Inject(DbService) private readonly db: DbService) {}

  parseCreate(body: unknown) {
    return createChannelSchema.parse(body);
  }

  parseUpdate(body: unknown) {
    return updateChannelSchema.parse(body);
  }

  async listChannels(user: AuthUser) {
    return this.db.db
      .select()
      .from(notificationChannels)
      .where(and(eq(notificationChannels.userId, user.id), isNull(notificationChannels.deletedAt)));
  }

  async createChannel(user: AuthUser, input: CreateChannelInput) {
    const id = randomUUID();
    await this.db.db.insert(notificationChannels).values({ id, userId: user.id, ...input });
    return this.getChannel(user, id);
  }

  async updateChannel(user: AuthUser, id: string, input: UpdateChannelInput) {
    await this.getChannel(user, id);
    await this.db.db.update(notificationChannels).set({ ...input, updatedAt: new Date().toISOString() }).where(eq(notificationChannels.id, id));
    return this.getChannel(user, id);
  }

  async deleteChannel(user: AuthUser, id: string) {
    await this.getChannel(user, id);
    await this.db.db.update(notificationChannels).set({ deletedAt: new Date().toISOString() }).where(eq(notificationChannels.id, id));
    return { ok: true };
  }

  async testChannel(user: AuthUser, id: string) {
    const channel = await this.getChannel(user, id);
    return this.sendToChannel(user.id, channel.id, channel.type, channel.config as Record<string, unknown>, {
      title: "Notification test",
      body: "Subscription Expense Manager notification test"
    }, "test_delivery");
  }

  async sendToChannel(
    userId: string,
    channelId: string | null,
    type: string,
    config: Record<string, unknown>,
    payload: NotificationPayload,
    logType: string,
    subscriptionId?: string | null,
    reminderRuleId?: string | null,
    sentAt = new Date().toISOString()
  ) {
    const result = await getNotificationAdapter(type).send(config, payload);
    const id = randomUUID();
    await this.db.db.insert(notificationLogs).values({
      id,
      userId,
      subscriptionId,
      channelId,
      reminderRuleId,
      type: logType,
      status: result.ok ? "sent" : "failed",
      title: payload.title,
      body: payload.body,
      response: result.response,
      error: result.error,
      sentAt
    });
    const rows = await this.db.db.select().from(notificationLogs).where(eq(notificationLogs.id, id)).limit(1);
    return rows[0]!;
  }

  async listLogs(user: AuthUser) {
    return this.db.db.select().from(notificationLogs).where(eq(notificationLogs.userId, user.id));
  }

  async getChannel(user: AuthUser, id: string) {
    const rows = await this.db.db
      .select()
      .from(notificationChannels)
      .where(and(eq(notificationChannels.id, id), eq(notificationChannels.userId, user.id), isNull(notificationChannels.deletedAt)))
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundException("Notification channel not found");
    }
    return rows[0];
  }
}
