<script setup lang="ts">
import { Bell, CalendarDays, CreditCard, DatabaseBackup, LayoutDashboard, LogOut, Settings, Shield, Users } from "lucide-vue-next";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const isAdminArea = computed(() => route.path.startsWith("/admin"));

const userLinks = [
  { to: "/app/subscriptions", label: "Subscriptions", icon: LayoutDashboard },
  { to: "/app/payments", label: "Payments", icon: CreditCard },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/settings", label: "Settings", icon: Settings }
];
const adminLinks = [
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/backups", label: "Backups", icon: DatabaseBackup },
  { to: "/admin/system", label: "System", icon: Shield },
  { to: "/admin/shared-data", label: "Shared", icon: LayoutDashboard },
  { to: "/admin/audit-logs", label: "Audit", icon: Bell }
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
          <span>{{ isAdminArea ? "Admin" : "Workspace" }}</span>
        </div>
      </div>
      <nav class="nav-list" aria-label="Primary">
        <RouterLink v-for="item in links" :key="item.to" :to="item.to" class="nav-link">
          <component :is="item.icon" :size="18" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-footer">
        <RouterLink v-if="auth.isAdmin && !isAdminArea" to="/admin/users" class="mode-link">Admin</RouterLink>
        <RouterLink v-if="isAdminArea" to="/app/subscriptions" class="mode-link">User</RouterLink>
        <button class="icon-text-button" type="button" @click="logout">
          <LogOut :size="18" aria-hidden="true" />
          <span>Logout</span>
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