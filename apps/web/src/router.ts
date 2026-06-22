import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import AppShell from "./components/AppShell.vue";
import { useAuthStore } from "./stores/auth";
import LoginView from "./views/LoginView.vue";

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
      { path: "", redirect: "/app/subscriptions" },
      { path: "subscriptions", component: PlaceholderView("Subscriptions", "Personal workspace") },
      { path: "payments", component: PlaceholderView("Payments", "Personal workspace") },
      { path: "calendar", component: PlaceholderView("Calendar", "Personal workspace") },
      { path: "notifications", component: PlaceholderView("Notifications", "Personal workspace") },
      { path: "settings", component: PlaceholderView("Settings", "Personal workspace") }
    ]
  },
  {
    path: "/admin",
    component: AppShell,
    meta: { admin: true },
    children: [
      { path: "", redirect: "/admin/users" },
      { path: "users", component: PlaceholderView("Users", "Admin workspace") },
      { path: "backups", component: PlaceholderView("Backups", "Admin workspace") },
      { path: "system", component: PlaceholderView("System", "Admin workspace") },
      { path: "shared-data", component: PlaceholderView("Shared Data", "Admin workspace") },
      { path: "audit-logs", component: PlaceholderView("Audit Logs", "Admin workspace") }
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