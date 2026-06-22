import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import AppShell from "./components/AppShell.vue";
import { useAuthStore } from "./stores/auth";
import LoginView from "./views/LoginView.vue";
import AdminAuditLogsView from "./views/admin/AuditLogsView.vue";
import AdminBackupsView from "./views/admin/BackupsView.vue";
import AdminSharedDataView from "./views/admin/SharedDataView.vue";
import AdminSystemView from "./views/admin/SystemView.vue";
import AdminUsersView from "./views/admin/UsersView.vue";
import CalendarView from "./views/user/CalendarView.vue";
import DashboardView from "./views/user/DashboardView.vue";
import NotificationsView from "./views/user/NotificationsView.vue";
import PaymentsView from "./views/user/PaymentsView.vue";
import SettingsView from "./views/user/SettingsView.vue";
import SubscriptionsView from "./views/user/SubscriptionsView.vue";

const PlaceholderView = (title: string, caption: string) => ({
  template: `<section class="view-panel"><div><p class="eyebrow">${caption}</p><h1>${title}</h1></div></section>`
});

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/app" },
  { path: "/login", component: LoginView, meta: { public: true } },
  {
    path: "/app",
    component: AppShell,
    children: [
      { path: "", component: DashboardView },
      { path: "subscriptions", component: SubscriptionsView },
      { path: "payments", component: PaymentsView },
      { path: "calendar", component: CalendarView },
      { path: "notifications", component: NotificationsView },
      { path: "settings", component: SettingsView }
    ]
  },
  {
    path: "/admin",
    component: AppShell,
    meta: { admin: true },
    children: [
      { path: "", redirect: "/admin/users" },
      { path: "users", component: AdminUsersView },
      { path: "backups", component: AdminBackupsView },
      { path: "system", component: AdminSystemView },
      { path: "shared-data", component: AdminSharedDataView },
      { path: "audit-logs", component: AdminAuditLogsView }
    ]
  }
];

export const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!to.meta.public && auth.token && !auth.user) {
    await auth.loadMe();
  }
  if (!to.meta.public && !auth.token) {
    return "/login";
  }
  if (to.meta.admin && !auth.isAdmin) {
    return "/app";
  }
  if (to.path === "/login" && auth.token) {
    return "/app";
  }
  return true;
});
