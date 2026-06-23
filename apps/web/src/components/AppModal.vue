<script setup lang="ts">
import { X } from "lucide-vue-next";

defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <section class="modal-panel" role="dialog" aria-modal="true" :aria-label="title">
        <header class="modal-header">
          <h2>{{ title }}</h2>
          <button class="icon-button" type="button" @click="emit('close')">
            <X :size="18" aria-hidden="true" />
          </button>
        </header>
        <slot />
      </section>
    </div>
  </Teleport>
</template>
