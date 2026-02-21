<template>
  <div ref="rootRef" class="relative inline-block text-left">
    <button
      type="button"
      class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="open = !open"
    >
      <slot name="trigger">⋯</slot>
    </button>

    <transition name="fade">
      <div
        v-if="open"
        class="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        role="menu"
      >
        <slot :close="close" />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const close = () => {
  open.value = false;
};

const handleOutside = (event: MouseEvent) => {
  if (!rootRef.value?.contains(event.target as Node)) {
    close();
  }
};

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close();
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleOutside);
  document.addEventListener('keydown', handleEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutside);
  document.removeEventListener('keydown', handleEscape);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
