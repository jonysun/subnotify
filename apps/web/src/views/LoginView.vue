<script setup lang="ts">
import { LockKeyhole, Server, UserRound } from "lucide-vue-next";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ApiError } from "../api/client";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const username = ref("admin");
const password = ref("admin123456");
const error = ref("");
const loading = ref(false);

async function submit() {
  loading.value = true;
  error.value = "";
  try {
    await auth.login(username.value, password.value);
    router.push(auth.isAdmin ? "/admin/users" : "/app/subscriptions");
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : "Login failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="login-copy">
        <div class="brand-block compact">
          <div class="brand-mark">S</div>
          <div>
            <strong>Subs Manager</strong>
            <span>Self-hosted subscriptions and expenses</span>
          </div>
        </div>
        <h1>Sign in</h1>
        <p>Manage renewals, payments, reminders, backups, and shared read-only admin views.</p>
      </div>
      <form class="login-form" @submit.prevent="submit">
        <label>
          <span>Username</span>
          <div class="input-row">
            <UserRound :size="18" aria-hidden="true" />
            <input v-model="username" autocomplete="username" />
          </div>
        </label>
        <label>
          <span>Password</span>
          <div class="input-row">
            <LockKeyhole :size="18" aria-hidden="true" />
            <input v-model="password" autocomplete="current-password" type="password" />
          </div>
        </label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="primary-button" :disabled="loading" type="submit">
          <Server :size="18" aria-hidden="true" />
          <span>{{ loading ? "Signing in" : "Sign in" }}</span>
        </button>
      </form>
    </section>
  </main>
</template>