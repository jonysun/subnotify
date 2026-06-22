import { apiFetch } from "./client";
import type { ApiUser } from "./client";

export type Subscription = {
  id: string;
  name: string;
  siteUrl: string;
  paymentMethod: string;
  currentCycle: "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  currentPrice: number;
  currentCurrency: string;
  nextDueDate: string;
  status: string;
  autoRenew: boolean;
  notes: string;
};
export type Payment = { id: string; subscriptionId?: string; paidAt: string; originalAmount: number; originalCurrency: string; baseAmount: number; baseCurrency: string; source: string; notes: string };
export type UserSettings = { baseCurrency: string; exchangeRateProvider: string; dataSharingEnabled: boolean };
export type ReminderRule = { id: string; name: string; daysBefore: number; enabled: boolean; channelIds: string[] };
export type NotificationChannel = { id: string; type: string; name: string; enabled: boolean; config: Record<string, unknown> };
export type NotificationLog = { id: string; type: string; status: string; title: string; body: string; sentAt: string };
export type Backup = { id: string; filename: string; storagePath: string; sizeBytes: number; databaseDriver: string; status: string; error: string; createdAt: string };
export type SystemStatus = { databaseDriver: string; appVersion: string; storagePath: string; userCount: number };
export type AuditLog = { id: string; actorId: string | null; action: string; targetType: string; targetId: string; metadata: Record<string, unknown>; createdAt: string };
export type SharedUser = Pick<ApiUser, "id" | "username" | "displayName" | "role" | "status">;

export const queries = {
  subscriptions: () => apiFetch<Subscription[]>("/api/subscriptions"),
  createSubscription: (body: Partial<Subscription> & { startDate: string }) => apiFetch<Subscription>("/api/subscriptions", { method: "POST", body: JSON.stringify(body) }),
  payments: () => apiFetch<Payment[]>("/api/payments"),
  createPayment: (body: Partial<Payment> & { paidAt: string; originalAmount: number; originalCurrency: string }) => apiFetch<Payment>("/api/payments", { method: "POST", body: JSON.stringify(body) }),
  settings: () => apiFetch<UserSettings>("/api/me/settings"),
  updateSettings: (body: Partial<UserSettings>) => apiFetch<UserSettings>("/api/me/settings", { method: "PATCH", body: JSON.stringify(body) }),
  reminderRules: () => apiFetch<ReminderRule[]>("/api/reminder-rules"),
  createReminderRule: (body: { name: string; daysBefore: number; channelIds: string[] }) => apiFetch<ReminderRule>("/api/reminder-rules", { method: "POST", body: JSON.stringify(body) }),
  notificationChannels: () => apiFetch<NotificationChannel[]>("/api/notification-channels"),
  createNotificationChannel: (body: { type: string; name: string; config: Record<string, unknown> }) => apiFetch<NotificationChannel>("/api/notification-channels", { method: "POST", body: JSON.stringify(body) }),
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
