<template>
  <div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
    <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
    <p class="mt-2 text-sm text-slate-600">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: 'No results',
    description: 'Try adjusting your filters or create a new record.'
  }
);
</script>
