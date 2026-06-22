import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { apiFetch, type ApiUser } from "../api/client";

export const useAuthStore = defineStore("auth", () => {
  const token = ref(localStorage.getItem("sem.token") ?? "");
  const user = ref<ApiUser | null>(null);
  const isAdmin = computed(() => user.value?.role === "admin");

  async function login(username: string, password: string) {
    const result = await apiFetch<{ accessToken: string; user: ApiUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    token.value = result.accessToken;
    user.value = result.user;
    localStorage.setItem("sem.token", result.accessToken);
  }

  function logout() {
    token.value = "";
    user.value = null;
    localStorage.removeItem("sem.token");
  }

  async function loadMe() {
    if (!token.value) {
      user.value = null;
      return;
    }
    try {
      user.value = await apiFetch<ApiUser>("/api/auth/me");
    } catch (error) {
      logout();
      throw error;
    }
  }

  return { token, user, login, logout, loadMe, isAdmin };
});