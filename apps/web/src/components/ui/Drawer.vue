<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-slate-900/50" @click="emitClose" />
        <section
          ref="panelRef"
          :class="[
            'absolute right-0 top-0 h-full bg-white shadow-xl outline-none',
            mobileFull ? 'w-full' : 'w-full max-w-md'
          ]"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          @keydown="onPanelKeydown"
        >
          <slot />
        </section>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();
const panelRef = ref<HTMLElement | null>(null);

const mobileFull = computed(() => window.matchMedia('(max-width: 767px)').matches);

const emitClose = () => emit('close');

const focusableSelector =
  'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const trapFocus = (event: KeyboardEvent) => {
  if (event.key !== 'Tab' || !panelRef.value) return;
  const focusables = Array.from(panelRef.value.querySelectorAll<HTMLElement>(focusableSelector));
  if (!focusables.length) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
};

const onPanelKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') emitClose();
  trapFocus(event);
};

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      await nextTick();
      panelRef.value?.focus();
      const first = panelRef.value?.querySelector<HTMLElement>(focusableSelector);
      first?.focus();
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
