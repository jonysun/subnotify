import { apiFetch } from "./client";
import type { ApiUser } from "./client";

export type Subscription = {
  id: string;
  name: string;
  siteUrl: string;
  paymentMethod: string;
  currentCycle: "weekly" | "monthly" | "quarterly" | "yearly" | "custom" | "one_time";
  currentPrice: number;
  currentCurrency: string;
  introPeriods: number;
  introPrice: number;
  renewalPrice: number;
  renewalCurrency: string;
  nextDueDate: string;
  status: string;
  autoRenew: boolean;
  remindersEnabled: boolean;
  startDate: string;
  endDate?: string;
  categoryId?: string;
  category?: { id: string; name: string; color: string } | null;
  tags: Array<{ id: string; name: string; color: string }>;
  notes: string;
};
export type Payment = {
  id: string;
  subscriptionId?: string;
  paidAt: string;
  periodStart?: string;
  periodEnd?: string;
  originalAmount: number;
  originalCurrency: string;
  baseAmount: number;
  baseCurrency: string;
  isBaseAmountManual: boolean;
  paymentMethodSnapshot: string;
  cycleSnapshot?: Subscription["currentCycle"];
  source: "manual" | "auto_renewal" | "imported";
  notes: string;
};
export type UserSettings = { baseCurrency: string; exchangeRateProvider: string; dataSharingEnabled: boolean; locale: "zh-CN" | "en-US"; timeZone?: string };
export type ReminderRule = {
  id: string;
  subscriptionId?: string;
  name: string;
  daysBefore: number;
  type: "before_expiry" | "on_expiry" | "after_expiry";
  value: number;
  unit: "days" | "hours";
  repeatIntervalHours: number;
  repeatUntil: "renewed" | "acknowledged" | "never";
  enabled: boolean;
  channelIds: string[];
};
export type NotificationChannel = { id: string; type: string; name: string; enabled: boolean; config: Record<string, unknown> };
export type NotificationLog = { id: string; type: string; status: string; title: string; body: string; sentAt: string };
export type Backup = { id: string; filename: string; storagePath: string; sizeBytes: number; databaseDriver: string; status: string; error: string; createdAt: string };
export type SystemStatus = { databaseDriver: string; appVersion: string; storagePath: string; userCount: number };
export type AuditLog = { id: string; actorId: string | null; action: string; targetType: string; targetId: string; metadata: Record<string, unknown>; createdAt: string };
export type SharedUser = Pick<ApiUser, "id" | "username" | "displayName" | "role" | "status">;
export type DashboardStats = {
  monthlyExpense: { amount: number; currency: string };
  yearlyExpense: { amount: number; monthlyAverage: number; currency: string };
  activeSubscriptions: { active: number; total: number; expiringSoon: number };
  recentPayments: Array<{ id: string; subscriptionId?: string; name: string; amount: number; currency: string; paidAt: string; source: string }>;
  upcomingRenewals: Array<{ id: string; name: string; amount: number; currency: string; renewalDate: string; daysUntilRenewal: number; autoRenew: boolean }>;
  expenseByCategory: Array<{ category: string; amount: number; percentage: number }>;
  expenseByType: Array<{ type: string; amount: number; percentage: number }>;
  schedulerStatus: null | Record<string, unknown>;
  schedulerStatusHistory: unknown[];
};

export const queries = {
  dashboardStats: () => apiFetch<DashboardStats>("/api/dashboard/stats"),
  subscriptions: () => apiFetch<Subscription[]>("/api/subscriptions"),
  createSubscription: (body: Partial<Subscription> & { startDate: string; initialPaymentPaid?: boolean; categoryName?: string; tagNames?: string[] }) => apiFetch<Subscription>("/api/subscriptions", { method: "POST", body: JSON.stringify(body) }),
  updateSubscription: (id: string, body: Partial<Subscription> & { categoryName?: string; tagNames?: string[] }) => apiFetch<Subscription>(`/api/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteSubscription: (id: string) => apiFetch<{ ok: boolean }>(`/api/subscriptions/${id}`, { method: "DELETE" }),
  renewSubscription: (id: string, body: { paidAt?: string; amount?: number; currency?: string; periods?: number; note?: string }) => apiFetch<{ subscription: Subscription; payment: Payment }>(`/api/subscriptions/${id}/renew`, { method: "POST", body: JSON.stringify(body) }),
  updateSubscriptionStatus: (id: string, status: Subscription["status"]) => apiFetch<Subscription>(`/api/subscriptions/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  payments: () => apiFetch<Payment[]>("/api/payments"),
  createPayment: (body: Partial<Payment> & { paidAt: string; originalAmount: number; originalCurrency: string }) => apiFetch<Payment>("/api/payments", { method: "POST", body: JSON.stringify(body) }),
  updatePayment: (id: string, body: Partial<Payment>) => apiFetch<Payment>(`/api/payments/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deletePayment: (id: string) => apiFetch<{ ok: boolean }>(`/api/payments/${id}`, { method: "DELETE" }),
  settings: () => apiFetch<UserSettings>("/api/me/settings"),
  updateSettings: (body: Partial<UserSettings>) => apiFetch<UserSettings>("/api/me/settings", { method: "PATCH", body: JSON.stringify(body) }),
  reminderRules: () => apiFetch<ReminderRule[]>("/api/reminder-rules"),
  createReminderRule: (body: { name: string; daysBefore: number; channelIds: string[] }) => apiFetch<ReminderRule>("/api/reminder-rules", { method: "POST", body: JSON.stringify(body) }),
  subscriptionReminderRules: (subscriptionId: string) => apiFetch<{ rules: ReminderRule[] }>(`/api/subscriptions/${subscriptionId}/reminders`),
  replaceSubscriptionReminderRules: (subscriptionId: string, rules: Array<Partial<ReminderRule> & { name: string }>) => apiFetch<{ rules: ReminderRule[] }>(`/api/subscriptions/${subscriptionId}/reminders`, { method: "PUT", body: JSON.stringify({ rules }) }),
  notificationChannels: () => apiFetch<NotificationChannel[]>("/api/notification-channels"),
  createNotificationChannel: (body: { type: string; name: string; config: Record<string, unknown> }) => apiFetch<NotificationChannel>("/api/notification-channels", { method: "POST", body: JSON.stringify(body) }),
  testNotificationChannel: (id: string) => apiFetch<NotificationLog>(`/api/notification-channels/${id}/test`, { method: "POST" }),
  notificationLogs: () => apiFetch<NotificationLog[]>("/api/notification-logs"),
  exchangeRate: (base: string, quote: string) => apiFetch<{ rate: number }>(`/api/exchange-rates?base=${base}&quote=${quote}`),
  adminUsers: () => apiFetch<ApiUser[]>("/api/admin/users"),
  createAdminUser: (body: { username: string; displayName: string; password: string; role: "admin" | "user" }) => apiFetch<ApiUser>("/api/admin/users", { method: "POST", body: JSON.stringify(body) }),
  updateAdminUserStatus: (id: string, status: "active" | "disabled") => apiFetch<ApiUser>(`/api/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  resetAdminUserPassword: (id: string, password: string) => apiFetch<ApiUser>(`/api/admin/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) }),
  backups: () => apiFetch<Backup[]>("/api/admin/backups"),
  createBackup: () => apiFetch<Backup>("/api/admin/backups", { method: "POST" }),
  restoreBackup: (backupId: string) => apiFetch<{ restoredFromBackupId: string; preRestoreBackupId: string }>("/api/admin/backups/restore", { method: "POST", body: JSON.stringify({ backupId }) }),
  system: () => apiFetch<SystemStatus>("/api/admin/system"),
  sharedUsers: () => apiFetch<SharedUser[]>("/api/admin/shared-users"),
  sharedSubscriptions: (userId: string) => apiFetch<Subscription[]>(`/api/admin/shared-users/${userId}/subscriptions`),
  sharedPayments: (userId: string) => apiFetch<Payment[]>(`/api/admin/shared-users/${userId}/payments`),
  auditLogs: () => apiFetch<AuditLog[]>("/api/admin/audit-logs")
};
