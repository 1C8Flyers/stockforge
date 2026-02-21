<template>
  <button
    type="button"
    :aria-label="ariaLabel"
    :disabled="disabled"
    class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  ariaLabel: string;
  disabled?: boolean;
}>();
</script>
