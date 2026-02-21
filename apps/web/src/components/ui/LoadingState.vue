<template>
  <div class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
    <div class="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
    {{ label }}
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
  }>(),
  { label: 'Loading…' }
);
</script>
