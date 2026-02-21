<template>
  <span :class="['inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', toneClass]">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    tone?: 'default' | 'success' | 'warning' | 'danger' | 'muted';
  }>(),
  { tone: 'default' }
);

const toneClass = computed(() => {
  switch (props.tone) {
    case 'success':
      return 'bg-emerald-100 text-emerald-700';
    case 'warning':
      return 'bg-amber-100 text-amber-800';
    case 'danger':
      return 'bg-red-100 text-red-700';
    case 'muted':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-blue-100 text-blue-700';
  }
});
</script>
