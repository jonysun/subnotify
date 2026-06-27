import type Database from "better-sqlite3";

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    last_login_at TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users (username)",
  `CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    base_currency TEXT NOT NULL DEFAULT 'CNY',
    exchange_rate_provider TEXT NOT NULL DEFAULT 'mock',
    data_sharing_enabled INTEGER NOT NULL DEFAULT 0,
    locale TEXT NOT NULL DEFAULT 'zh-CN',
    time_zone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS user_settings_user_idx ON user_settings (user_id)",
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#4f46e5',
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_idx ON categories (user_id, name)",
  `CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#0f766e',
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name_idx ON tags (user_id, name)",
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    site_url TEXT NOT NULL DEFAULT '',
    payment_method TEXT NOT NULL DEFAULT '',
    current_cycle TEXT NOT NULL,
    current_price REAL NOT NULL,
    current_currency TEXT NOT NULL DEFAULT 'CNY',
    intro_periods INTEGER NOT NULL DEFAULT 0,
    intro_price REAL NOT NULL DEFAULT 0,
    renewal_price REAL NOT NULL DEFAULT 0,
    renewal_currency TEXT NOT NULL DEFAULT 'CNY',
    start_date TEXT NOT NULL,
    end_date TEXT,
    next_due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    auto_renew INTEGER NOT NULL DEFAULT 0,
    reminders_enabled INTEGER NOT NULL DEFAULT 1,
    notes TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions (user_id)",
  "CREATE INDEX IF NOT EXISTS subscriptions_next_due_idx ON subscriptions (next_due_date)",
  `CREATE TABLE IF NOT EXISTS subscription_versions (
    id TEXT PRIMARY KEY NOT NULL,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    name TEXT NOT NULL,
    site_url TEXT NOT NULL DEFAULT '',
    payment_method TEXT NOT NULL DEFAULT '',
    billing_cycle TEXT NOT NULL,
    price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CNY',
    intro_periods INTEGER NOT NULL DEFAULT 0,
    intro_price REAL NOT NULL DEFAULT 0,
    renewal_price REAL NOT NULL DEFAULT 0,
    renewal_currency TEXT NOT NULL DEFAULT 'CNY',
    start_date TEXT NOT NULL,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    auto_renew INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS subscription_versions_version_idx ON subscription_versions (subscription_id, version)",
  `CREATE TABLE IF NOT EXISTS subscription_tags (
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS subscription_tags_pair_idx ON subscription_tags (subscription_id, tag_id)",
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
    paid_at TEXT NOT NULL,
    period_start TEXT,
    period_end TEXT,
    original_amount REAL NOT NULL,
    original_currency TEXT NOT NULL,
    base_amount REAL NOT NULL,
    base_currency TEXT NOT NULL DEFAULT 'CNY',
    exchange_rate REAL NOT NULL DEFAULT 1,
    exchange_rate_provider TEXT NOT NULL DEFAULT 'mock',
    is_base_amount_manual INTEGER NOT NULL DEFAULT 0,
    payment_method_snapshot TEXT NOT NULL DEFAULT '',
    cycle_snapshot TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    notes TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE INDEX IF NOT EXISTS payments_user_paid_at_idx ON payments (user_id, paid_at)",
  "CREATE INDEX IF NOT EXISTS payments_subscription_idx ON payments (subscription_id)",
  `CREATE TABLE IF NOT EXISTS exchange_rates (
    id TEXT PRIMARY KEY NOT NULL,
    base_currency TEXT NOT NULL,
    quote_currency TEXT NOT NULL,
    rate REAL NOT NULL,
    provider TEXT NOT NULL DEFAULT 'mock',
    rate_date TEXT NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS exchange_rates_lookup_idx ON exchange_rates (base_currency, quote_currency, provider, rate_date)",
  `CREATE TABLE IF NOT EXISTS reminder_rules (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_id TEXT REFERENCES subscriptions(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      days_before INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'before_expiry',
      value INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'days',
      repeat_interval_hours INTEGER NOT NULL DEFAULT 0,
      repeat_until TEXT NOT NULL DEFAULT 'renewed',
      enabled INTEGER NOT NULL DEFAULT 1,
    channel_ids TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE INDEX IF NOT EXISTS reminder_rules_user_idx ON reminder_rules (user_id)",
  `CREATE TABLE IF NOT EXISTS notification_channels (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    config TEXT NOT NULL DEFAULT '{}',
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE INDEX IF NOT EXISTS notification_channels_user_idx ON notification_channels (user_id)",
  `CREATE TABLE IF NOT EXISTS scheduler_logs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    checked_count INTEGER NOT NULL DEFAULT 0,
    matched_count INTEGER NOT NULL DEFAULT 0,
    deduped_count INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    metadata TEXT NOT NULL DEFAULT '{}'
  )`,
  "CREATE INDEX IF NOT EXISTS scheduler_logs_user_started_idx ON scheduler_logs (user_id, started_at)",
  `CREATE TABLE IF NOT EXISTS notification_logs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
    channel_id TEXT REFERENCES notification_channels(id) ON DELETE SET NULL,
    reminder_rule_id TEXT REFERENCES reminder_rules(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    response TEXT NOT NULL DEFAULT '',
    error TEXT NOT NULL DEFAULT '',
    sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "DROP INDEX IF EXISTS notification_logs_due_dedupe_idx",
  "CREATE UNIQUE INDEX IF NOT EXISTS notification_logs_due_dedupe_idx ON notification_logs (user_id, subscription_id, reminder_rule_id, channel_id, type, sent_at)",
  `CREATE TABLE IF NOT EXISTS sync_events (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    version INTEGER NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE INDEX IF NOT EXISTS sync_events_user_cursor_idx ON sync_events (user_id, created_at)",
  `CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY NOT NULL,
    created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    database_driver TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    error TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL DEFAULT '',
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action, created_at)"
];

export function migrateSqlite(database: Database.Database) {
  database.pragma("foreign_keys = ON");
  const migrate = database.transaction(() => {
    for (const statement of statements) {
      database.exec(statement);
    }
  });
  migrate();
  addColumnIfMissing(database, "subscriptions", "intro_periods", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(database, "subscriptions", "intro_price", "REAL NOT NULL DEFAULT 0");
  addColumnIfMissing(database, "subscriptions", "renewal_price", "REAL NOT NULL DEFAULT 0");
  addColumnIfMissing(database, "subscriptions", "renewal_currency", "TEXT NOT NULL DEFAULT 'CNY'");
  addColumnIfMissing(database, "subscription_versions", "intro_periods", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(database, "subscription_versions", "intro_price", "REAL NOT NULL DEFAULT 0");
  addColumnIfMissing(database, "subscription_versions", "renewal_price", "REAL NOT NULL DEFAULT 0");
  addColumnIfMissing(database, "subscription_versions", "renewal_currency", "TEXT NOT NULL DEFAULT 'CNY'");
  addColumnIfMissing(database, "reminder_rules", "type", "TEXT NOT NULL DEFAULT 'before_expiry'");
  addColumnIfMissing(database, "reminder_rules", "value", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(database, "reminder_rules", "unit", "TEXT NOT NULL DEFAULT 'days'");
  addColumnIfMissing(database, "reminder_rules", "repeat_interval_hours", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(database, "reminder_rules", "repeat_until", "TEXT NOT NULL DEFAULT 'renewed'");
}

function addColumnIfMissing(database: Database.Database, tableName: string, columnName: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}
