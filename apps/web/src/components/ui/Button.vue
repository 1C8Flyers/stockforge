<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
      variantClass,
      sizeClass
    ]"
  >
    <svg v-if="loading" class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" class="opacity-90" />
    </svg>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    type: 'button',
    disabled: false
  }
);

const variantClass = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50';
    case 'ghost':
      return 'bg-transparent text-slate-700 hover:bg-slate-100';
    case 'danger':
      return 'bg-red-600 text-white hover:bg-red-700';
    default:
      return 'bg-brand-600 text-white hover:bg-brand-700';
  }
});

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-3 text-xs';
    case 'lg':
      return 'px-5 text-base';
    default:
      return 'px-4 text-sm';
  }
});
</script>
