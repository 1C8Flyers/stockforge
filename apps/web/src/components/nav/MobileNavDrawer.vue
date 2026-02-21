<template>
  <Drawer :open="open" @close="emit('close')">
    <div class="flex h-full flex-col p-4">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-base font-semibold">Navigation</h2>
        <button
          type="button"
          class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300"
          aria-label="Close navigation"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>
      <SideNav @navigate="emit('close')" />
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import Drawer from '../ui/Drawer.vue';
import SideNav from './SideNav.vue';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();
</script>
