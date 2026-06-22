<script setup lang="ts">
defineProps<{ title: string; text: string }>();
</script>
<template>
  <div class="empty-state"><strong>{{ title }}</strong><p>{{ text }}</p></div>
</template>