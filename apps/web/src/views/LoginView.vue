<script setup lang="ts">
import { CalendarCheck, LockKeyhole, Server, UserRound } from "lucide-vue-next";
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
    <section class="login-box">
      <div class="login-heading">
        <CalendarCheck :size="28" aria-hidden="true" />
        <h1>订阅管理系统</h1>
        <p>登录管理您的订阅提醒、支付明细和多用户数据</p>
      </div>
      <form class="login-form" @submit.prevent="submit">
        <label>
          <span>用户名</span>
          <div class="input-row">
            <UserRound :size="18" aria-hidden="true" />
            <input v-model="username" autocomplete="username" />
          </div>
        </label>
        <label>
          <span>密码</span>
          <div class="input-row">
            <LockKeyhole :size="18" aria-hidden="true" />
            <input v-model="password" autocomplete="current-password" type="password" />
          </div>
        </label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="primary-button" :disabled="loading" type="submit">
          <Server :size="18" aria-hidden="true" />
          <span>{{ loading ? "登录中..." : "登录" }}</span>
        </button>
      </form>
    </section>
  </main>
</template>
