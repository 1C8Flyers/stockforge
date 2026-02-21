<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="open" class="fixed inset-0 z-[60]">
        <div class="absolute inset-0 bg-slate-900/50" @click="emit('cancel')" />
        <div class="absolute inset-0 flex items-center justify-center p-4">
          <section
            ref="dialogRef"
            class="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            role="alertdialog"
            aria-modal="true"
            tabindex="-1"
            @keydown="onKeydown"
          >
            <h3 class="text-lg font-semibold text-slate-900">{{ title }}</h3>
            <p class="mt-2 text-sm text-slate-600">{{ message }}</p>
            <div class="mt-4 flex justify-end gap-2">
              <button class="min-h-11 rounded-lg border border-slate-300 px-4 text-sm" @click="emit('cancel')">Cancel</button>
              <button class="min-h-11 rounded-lg bg-red-600 px-4 text-sm text-white" @click="emit('confirm')">Confirm</button>
            </div>
          </section>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  title?: string;
  message?: string;
}>();

const emit = defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>();
const dialogRef = ref<HTMLElement | null>(null);

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') emit('cancel');
};

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      await nextTick();
      dialogRef.value?.focus();
    } else {
      document.body.style.overflow = '';
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  document.body.style.overflow = '';
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
