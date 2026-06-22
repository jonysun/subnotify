<script setup lang="ts">
defineProps<{ label: string; value: string; detail?: string }>();
</script>
<template>
  <article class="stat-card"><span>{{ label }}</span><strong>{{ value }}</strong><p v-if="detail">{{ detail }}</p></article>
</template>