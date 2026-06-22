<script setup lang="ts">
import { KeyRound, Plus } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { reactive, ref } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import { queries } from "../../api/queries";

const query = useQuery({ queryKey: ["admin-users"], queryFn: queries.adminUsers });
const form = reactive({ username: "", displayName: "", password: "", role: "user" as "admin" | "user" });
const resetPassword = ref("changeme123");

async function create() {
  await queries.createAdminUser(form);
  Object.assign(form, { username: "", displayName: "", password: "", role: "user" });
  await query.refetch();
}

async function setStatus(id: string, status: "active" | "disabled") {
  await queries.updateAdminUserStatus(id, status);
  await query.refetch();
}

async function reset(id: string) {
  await queries.resetAdminUserPassword(id, resetPassword.value);
}
</script>

<template>
  <section class="split-page">
    <form class="form-panel" @submit.prevent="create">
      <h1>Users</h1>
      <label><span>Username</span><input v-model="form.username" required /></label>
      <label><span>Display name</span><input v-model="form.displayName" required /></label>
      <label><span>Password</span><input v-model="form.password" minlength="8" required type="password" /></label>
      <label><span>Role</span><select v-model="form.role"><option value="user">user</option><option value="admin">admin</option></select></label>
      <button class="primary-button" type="submit"><Plus :size="18" /> <span>Create user</span></button>
      <label><span>Reset password value</span><input v-model="resetPassword" minlength="8" type="password" /></label>
    </form>
    <section class="table-panel">
      <EmptyState v-if="query.data.value?.length === 0" title="No users" text="Created accounts will appear here." />
      <div v-else class="row-list">
        <div v-for="item in query.data.value" :key="item.id" class="data-row admin-row">
          <span>{{ item.username }}</span><span>{{ item.displayName }}</span><span>{{ item.role }}</span><StatusBadge :status="item.status" />
          <button class="small-button" type="button" @click="setStatus(item.id, item.status === 'active' ? 'disabled' : 'active')">{{ item.status === "active" ? "Disable" : "Enable" }}</button>
          <button class="small-button" type="button" @click="reset(item.id)"><KeyRound :size="15" /> <span>Reset</span></button>
        </div>
      </div>
    </section>
  </section>
</template>
