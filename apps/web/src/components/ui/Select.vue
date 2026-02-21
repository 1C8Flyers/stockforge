<template>
  <label class="block space-y-1.5">
    <span v-if="label" class="text-sm font-medium text-slate-700">{{ label }}</span>
    <select
      :value="modelValue"
      :disabled="disabled"
      :class="[
        'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm',
        'focus:border-brand-600 focus:ring-brand-600 disabled:cursor-not-allowed disabled:bg-slate-100',
        error ? 'border-red-400' : 'border-slate-300'
      ]"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <slot />
    </select>
    <span v-if="help && !error" class="text-xs text-slate-500">{{ help }}</span>
    <span v-if="error" class="text-xs text-red-600">{{ error }}</span>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string | number;
  label?: string;
  disabled?: boolean;
  help?: string;
  error?: string;
}>();

defineEmits<{ (e: 'update:modelValue', value: string): void }>();
</script>
