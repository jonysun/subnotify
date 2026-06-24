import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
};

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
    status: text("status", { enum: ["active", "disabled"] }).notNull().default("active"),
    lastLoginAt: text("last_login_at"),
    deletedAt: text("deleted_at"),
    ...timestamps
  },
  (table) => ({
    usernameIdx: uniqueIndex("users_username_idx").on(table.username)
  })
);

export const userSettings = sqliteTable(
  "user_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    baseCurrency: text("base_currency").notNull().default("CNY"),
    exchangeRateProvider: text("exchange_rate_provider").notNull().default("mock"),
    dataSharingEnabled: integer("data_sharing_enabled", { mode: "boolean" }).notNull().default(false),
    locale: text("locale").notNull().default("zh-CN"),
    timeZone: text("time_zone").notNull().default("Asia/Shanghai"),
    ...timestamps
  },
  (table) => ({
    userIdx: uniqueIndex("user_settings_user_idx").on(table.userId)
  })
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#4f46e5"),
    deletedAt: text("deleted_at"),
    ...timestamps
  },
  (table) => ({
    userNameIdx: uniqueIndex("categories_user_name_idx").on(table.userId, table.name)
  })
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#0f766e"),
    deletedAt: text("deleted_at"),
    ...timestamps
  },
  (table) => ({
    userNameIdx: uniqueIndex("tags_user_name_idx").on(table.userId, table.name)
  })
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    siteUrl: text("site_url").notNull().default(""),
    paymentMethod: text("payment_method").notNull().default(""),
    currentCycle: text("current_cycle", { enum: ["weekly", "monthly", "quarterly", "yearly", "custom", "one_time"] }).notNull(),
    currentPrice: real("current_price").notNull(),
    currentCurrency: text("current_currency").notNull().default("CNY"),
    introPeriods: integer("intro_periods").notNull().default(0),
    introPrice: real("intro_price").notNull().default(0),
    renewalPrice: real("renewal_price").notNull().default(0),
    renewalCurrency: text("renewal_currency").notNull().default("CNY"),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    nextDueDate: text("next_due_date").notNull(),
    status: text("status", { enum: ["active", "expired", "paused", "cancelled", "unavailable"] }).notNull().default("active"),
    autoRenew: integer("auto_renew", { mode: "boolean" }).notNull().default(false),
    remindersEnabled: integer("reminders_enabled", { mode: "boolean" }).notNull().default(true),
    notes: text("notes").notNull().default(""),
    version: integer("version").notNull().default(1),
    deletedAt: text("deleted_at"),
    ...timestamps
  },
  (table) => ({
    userIdx: index("subscriptions_user_idx").on(table.userId),
    nextDueIdx: index("subscriptions_next_due_idx").on(table.nextDueDate)
  })
);

export const subscriptionVersions = sqliteTable(
  "subscription_versions",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    name: text("name").notNull(),
    siteUrl: text("site_url").notNull().default(""),
    paymentMethod: text("payment_method").notNull().default(""),
    billingCycle: text("billing_cycle", { enum: ["weekly", "monthly", "quarterly", "yearly", "custom", "one_time"] }).notNull(),
    price: real("price").notNull(),
    currency: text("currency").notNull().default("CNY"),
    introPeriods: integer("intro_periods").notNull().default(0),
    introPrice: real("intro_price").notNull().default(0),
    renewalPrice: real("renewal_price").notNull().default(0),
    renewalCurrency: text("renewal_currency").notNull().default("CNY"),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    status: text("status", { enum: ["active", "expired", "paused", "cancelled", "unavailable"] }).notNull().default("active"),
    autoRenew: integer("auto_renew", { mode: "boolean" }).notNull().default(false),
    notes: text("notes").notNull().default(""),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    subscriptionVersionIdx: uniqueIndex("subscription_versions_version_idx").on(table.subscriptionId, table.version)
  })
);

export const subscriptionTags = sqliteTable(
  "subscription_tags",
  {
    subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    pairIdx: uniqueIndex("subscription_tags_pair_idx").on(table.subscriptionId, table.tagId)
  })
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    paidAt: text("paid_at").notNull(),
    periodStart: text("period_start"),
    periodEnd: text("period_end"),
    originalAmount: real("original_amount").notNull(),
    originalCurrency: text("original_currency").notNull(),
    baseAmount: real("base_amount").notNull(),
    baseCurrency: text("base_currency").notNull().default("CNY"),
    exchangeRate: real("exchange_rate").notNull().default(1),
    exchangeRateProvider: text("exchange_rate_provider").notNull().default("mock"),
    isBaseAmountManual: integer("is_base_amount_manual", { mode: "boolean" }).notNull().default(false),
    paymentMethodSnapshot: text("payment_method_snapshot").notNull().default(""),
    cycleSnapshot: text("cycle_snapshot", { enum: ["weekly", "monthly", "quarterly", "yearly", "custom", "one_time"] }),
    source: text("source", { enum: ["manual", "auto_renewal", "imported"] }).notNull().default("manual"),
    notes: text("notes").notNull().default(""),
    version: integer("version").notNull().default(1),
    deletedAt: text("deleted_at"),
    ...timestamps
  },
  (table) => ({
    userPaidAtIdx: index("payments_user_paid_at_idx").on(table.userId, table.paidAt),
    subscriptionIdx: index("payments_subscription_idx").on(table.subscriptionId)
  })
);

export const exchangeRates = sqliteTable(
  "exchange_rates",
  {
    id: text("id").primaryKey(),
    baseCurrency: text("base_currency").notNull(),
    quoteCurrency: text("quote_currency").notNull(),
    rate: real("rate").notNull(),
    provider: text("provider").notNull().default("mock"),
    rateDate: text("rate_date").notNull(),
    fetchedAt: text("fetched_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    rateIdx: uniqueIndex("exchange_rates_lookup_idx").on(table.baseCurrency, table.quoteCurrency, table.provider, table.rateDate)
  })
);

export const reminderRules = sqliteTable(
  "reminder_rules",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    daysBefore: integer("days_before").notNull(),
    type: text("type", { enum: ["before_expiry", "on_expiry", "after_expiry"] }).notNull().default("before_expiry"),
    value: integer("value").notNull().default(0),
    unit: text("unit", { enum: ["days", "hours"] }).notNull().default("days"),
    repeatIntervalHours: integer("repeat_interval_hours").notNull().default(0),
    repeatUntil: text("repeat_until", { enum: ["renewed", "acknowledged", "never"] }).notNull().default("renewed"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    channelIds: text("channel_ids", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    ...timestamps
  },
  (table) => ({
    userIdx: index("reminder_rules_user_idx").on(table.userId)
  })
);

export const notificationChannels = sqliteTable(
  "notification_channels",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["smtp", "telegram", "webhook", "bark", "serverchan", "pushplus"] }).notNull(),
    name: text("name").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    config: text("config", { mode: "json" }).$type<Record<string, unknown>>().notNull().default(sql`'{}'`),
    deletedAt: text("deleted_at"),
    ...timestamps
  },
  (table) => ({
    userIdx: index("notification_channels_user_idx").on(table.userId)
  })
);

export const notificationLogs = sqliteTable(
  "notification_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    channelId: text("channel_id").references(() => notificationChannels.id, { onDelete: "set null" }),
    reminderRuleId: text("reminder_rule_id").references(() => reminderRules.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    status: text("status").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    response: text("response").notNull().default(""),
    error: text("error").notNull().default(""),
    sentAt: text("sent_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    dueDedupeIdx: uniqueIndex("notification_logs_due_dedupe_idx").on(table.userId, table.subscriptionId, table.reminderRuleId, table.type, table.sentAt)
  })
);

export const syncEvents = sqliteTable(
  "sync_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    resource: text("resource").notNull(),
    resourceId: text("resource_id").notNull(),
    operation: text("operation", { enum: ["created", "updated", "deleted"] }).notNull(),
    version: integer("version").notNull(),
    data: text("data", { mode: "json" }).$type<Record<string, unknown>>().notNull().default(sql`'{}'`),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    userCursorIdx: index("sync_events_user_cursor_idx").on(table.userId, table.createdAt)
  })
);

export const backups = sqliteTable(
  "backups",
  {
    id: text("id").primaryKey(),
    createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    filename: text("filename").notNull(),
    storagePath: text("storage_path").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    databaseDriver: text("database_driver").notNull(),
    status: text("status").notNull().default("completed"),
    error: text("error").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  }
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull().default(""),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().notNull().default(sql`'{}'`),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    actionIdx: index("audit_logs_action_idx").on(table.action, table.createdAt)
  })
);

export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId]
  }),
  subscriptions: many(subscriptions),
  payments: many(payments)
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  category: one(categories, { fields: [subscriptions.categoryId], references: [categories.id] }),
  versions: many(subscriptionVersions),
  payments: many(payments)
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  subscription: one(subscriptions, { fields: [payments.subscriptionId], references: [subscriptions.id] })
}));
