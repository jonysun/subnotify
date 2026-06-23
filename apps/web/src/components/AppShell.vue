<script setup lang="ts">
import { Bell, CalendarDays, CreditCard, DatabaseBackup, Gauge, LayoutDashboard, LogOut, Settings, Shield, Users } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { computed, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { queries } from "../api/queries";
import { setLocale, useI18n, type MessageKey } from "../i18n";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const isAdminArea = computed(() => route.path.startsWith("/admin"));
const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: queries.settings, enabled: computed(() => Boolean(auth.token)) });
const { t } = useI18n();
watchEffect(() => setLocale(settingsQuery.data.value?.locale));

const userLinks: Array<{ to: string; labelKey: MessageKey; icon: typeof Gauge }> = [
  { to: "/app", labelKey: "dashboard", icon: Gauge },
  { to: "/app/subscriptions", labelKey: "subscriptions", icon: LayoutDashboard },
  { to: "/app/payments", labelKey: "payments", icon: CreditCard },
  { to: "/app/calendar", labelKey: "calendar", icon: CalendarDays },
  { to: "/app/notifications", labelKey: "notifications", icon: Bell },
  { to: "/app/settings", labelKey: "settings", icon: Settings }
];
const adminLinks: Array<{ to: string; labelKey: MessageKey; icon: typeof Gauge }> = [
  { to: "/admin/users", labelKey: "users", icon: Users },
  { to: "/admin/backups", labelKey: "backups", icon: DatabaseBackup },
  { to: "/admin/system", labelKey: "system", icon: Shield },
  { to: "/admin/shared-data", labelKey: "shared", icon: LayoutDashboard },
  { to: "/admin/audit-logs", labelKey: "audit", icon: Bell }
];
const links = computed(() => (isAdminArea.value ? adminLinks : userLinks));

function logout() {
  auth.logout();
  router.push("/login");
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand-block">
        <div class="brand-mark">S</div>
        <div>
          <strong>Subs Manager</strong>
          <span>{{ isAdminArea ? t("admin") : t("workspace") }}</span>
        </div>
      </div>
      <nav class="nav-list" aria-label="Primary">
        <RouterLink v-for="item in links" :key="item.to" :to="item.to" class="nav-link">
          <component :is="item.icon" :size="18" aria-hidden="true" />
          <span>{{ t(item.labelKey) }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-footer">
        <RouterLink v-if="auth.isAdmin && !isAdminArea" to="/admin/users" class="mode-link">{{ t("admin") }}</RouterLink>
        <RouterLink v-if="isAdminArea" to="/app/subscriptions" class="mode-link">{{ t("user") }}</RouterLink>
        <button class="icon-text-button" type="button" @click="logout">
          <LogOut :size="18" aria-hidden="true" />
          <span>{{ t("logout") }}</span>
        </button>
      </div>
    </aside>
    <main class="content">
      <header class="topbar">
        <div>
          <p class="eyebrow">{{ auth.user?.username }}</p>
          <h2>{{ auth.user?.displayName ?? "Workspace" }}</h2>
        </div>
      </header>
      <RouterView />
    </main>
  </div>
</template>
