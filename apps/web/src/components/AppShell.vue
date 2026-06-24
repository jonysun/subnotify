<script setup lang="ts">
import { Bell, CalendarDays, CreditCard, DatabaseBackup, Gauge, History, LayoutDashboard, List, LogOut, Settings, Shield, Users } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from "vue";
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
const menuOpen = ref(false);
const nowText = ref("");
let timer: number | undefined;
watchEffect(() => setLocale(settingsQuery.data.value?.locale));

const userLinks: Array<{ to: string; labelKey: MessageKey; icon: typeof Gauge }> = [
  { to: "/app", labelKey: "dashboard", icon: Gauge },
  { to: "/app/subscriptions", labelKey: "subscriptions", icon: List },
  { to: "/app/payments", labelKey: "payments", icon: CreditCard },
  { to: "/app/calendar", labelKey: "calendar", icon: CalendarDays },
  { to: "/app/notifications", labelKey: "notifications", icon: History },
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

function isActiveLink(path: string) {
  if (path === "/app") return route.path === "/app";
  return route.path === path || route.path.startsWith(`${path}/`);
}

function updateClock() {
  nowText.value = new Date().toLocaleString("zh-CN", {
    timeZone: settingsQuery.data.value?.timeZone ?? "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

onMounted(() => {
  updateClock();
  timer = window.setInterval(updateClock, 1000);
});

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer);
});

function logout() {
  auth.logout();
  router.push("/login");
}
</script>

<template>
  <div class="app-frame">
    <nav class="top-nav">
      <div class="nav-inner">
        <div class="nav-brand">
          <LayoutDashboard :size="26" aria-hidden="true" />
          <strong>订阅管理系统</strong>
          <span class="system-clock">{{ nowText }} Asia/Shanghai</span>
        </div>
        <div class="desktop-nav">
          <RouterLink v-for="item in links" :key="item.to" :to="item.to" class="top-link" :class="{ active: isActiveLink(item.to) }">
            <component :is="item.icon" :size="16" aria-hidden="true" />
            <span>{{ t(item.labelKey) }}</span>
          </RouterLink>
          <RouterLink v-if="auth.isAdmin && !isAdminArea" to="/admin/users" class="top-link">
            <Shield :size="16" aria-hidden="true" />
            <span>{{ t("admin") }}</span>
          </RouterLink>
          <RouterLink v-if="isAdminArea" to="/app/subscriptions" class="top-link">
            <Users :size="16" aria-hidden="true" />
            <span>{{ t("user") }}</span>
          </RouterLink>
          <button class="top-link logout-link" type="button" @click="logout">
            <LogOut :size="16" aria-hidden="true" />
            <span>{{ t("logout") }}</span>
          </button>
        </div>
        <button class="mobile-menu-button" type="button" @click="menuOpen = !menuOpen">
          <Bell v-if="menuOpen" :size="20" aria-hidden="true" />
          <LayoutDashboard v-else :size="20" aria-hidden="true" />
        </button>
      </div>
      <div v-if="menuOpen" class="mobile-nav">
        <div class="mobile-time">{{ nowText }} Asia/Shanghai</div>
        <RouterLink v-for="item in links" :key="item.to" :to="item.to" class="mobile-link" :class="{ active: isActiveLink(item.to) }" @click="menuOpen = false">
          <component :is="item.icon" :size="18" aria-hidden="true" />
          <span>{{ t(item.labelKey) }}</span>
        </RouterLink>
        <RouterLink v-if="auth.isAdmin && !isAdminArea" to="/admin/users" class="mobile-link" @click="menuOpen = false">{{ t("admin") }}</RouterLink>
        <RouterLink v-if="isAdminArea" to="/app/subscriptions" class="mobile-link" @click="menuOpen = false">{{ t("user") }}</RouterLink>
        <button class="mobile-link" type="button" @click="logout">
          <LogOut :size="18" aria-hidden="true" />
          <span>{{ t("logout") }}</span>
        </button>
      </div>
    </nav>
    <main class="content page-container">
      <header class="page-titlebar">
        <div>
          <p class="eyebrow">{{ auth.user?.username }}</p>
          <h2>{{ auth.user?.displayName ?? (isAdminArea ? t("admin") : t("workspace")) }}</h2>
        </div>
      </header>
      <RouterView />
    </main>
  </div>
</template>
