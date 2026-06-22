<script setup lang="ts">
import { Save } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { reactive, watchEffect } from "vue";
import { queries } from "../../api/queries";
const query = useQuery({ queryKey: ["settings"], queryFn: queries.settings });
const form = reactive({ baseCurrency: "CNY", exchangeRateProvider: "mock", dataSharingEnabled: false });
watchEffect(() => { if (query.data.value) Object.assign(form, query.data.value); });
async function save() { await queries.updateSettings(form); await query.refetch(); }
</script>
<template>
  <form class="form-panel settings-panel" @submit.prevent="save">
    <h1>Settings</h1>
    <label><span>Base currency</span><input v-model="form.baseCurrency" maxlength="3" /></label>
    <label><span>Exchange provider</span><input v-model="form.exchangeRateProvider" /></label>
    <label class="check-row"><input v-model="form.dataSharingEnabled" type="checkbox" /><span>Data sharing</span></label>
    <button class="primary-button" type="submit"><Save :size="18" /> <span>Save</span></button>
  </form>
</template>