export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "disabled"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = ["active", "expired", "paused", "cancelled", "unavailable"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_CYCLES = ["weekly", "monthly", "quarterly", "yearly", "custom"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const PAYMENT_SOURCES = ["manual", "auto_renewal", "imported"] as const;
export type PaymentSource = (typeof PAYMENT_SOURCES)[number];

export const NOTIFICATION_CHANNELS = ["smtp", "telegram", "webhook", "bark", "serverchan", "pushplus"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
