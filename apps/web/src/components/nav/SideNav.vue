<template>
  <nav class="space-y-1" aria-label="Main navigation">
    <RouterLink
      v-for="item in navItems"
      :key="item.path"
      :to="item.path"
      class="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-medium transition"
      :class="
        route.path === item.path
          ? 'bg-brand-100 text-brand-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      "
      @click="emit('navigate')"
    >
      <span>{{ item.label }}</span>
      <span
        v-if="item.path === '/transfers' && pendingTransferCount > 0"
        class="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700"
      >
        {{ pendingTransferCount }}
      </span>
      <span
        v-else-if="item.path === '/meetings' && pendingMeetingCount > 0"
        class="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700"
      >
        {{ pendingMeetingCount }}
      </span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../api';

const emit = defineEmits<{ (e: 'navigate'): void }>();
const route = useRoute();
const auth = useAuthStore();
const pendingTransferCount = ref(0);
const pendingMeetingCount = ref(0);
let refreshTimer: number | null = null;

const loadPendingTransferCount = async () => {
  try {
    const transfers = (await api.get('/transfers')).data as Array<{ status?: string }>;
    pendingTransferCount.value = transfers.filter((t) => t.status === 'DRAFT').length;
  } catch {
    pendingTransferCount.value = 0;
  }
};

const loadPendingMeetingCount = async () => {
  try {
    const summary = (await api.get('/meetings/pending-summary')).data as { totalPending?: number };
    pendingMeetingCount.value = Number(summary?.totalPending || 0);
  } catch {
    pendingMeetingCount.value = 0;
  }
};

const loadPendingCounts = async () => {
  await Promise.all([loadPendingTransferCount(), loadPendingMeetingCount()]);
};

const navItems = computed(() => {
  const base = [
    { path: '/', label: 'Dashboard' },
    { path: '/shareholders', label: 'Shareholders' },
    { path: '/lots', label: 'Lots' },
    { path: '/transfers', label: 'Transfers' },
    { path: '/meetings', label: 'Meetings' },
    { path: '/reports', label: 'Reports' },
    { path: '/audit-log', label: 'Audit Log' },
    { path: '/user-manual', label: 'User Manual' }
  ];

  if (auth.isAdmin) {
    base.push({ path: '/admin', label: 'Admin' });
  }

  return base;
});

onMounted(() => {
  loadPendingCounts();
  refreshTimer = window.setInterval(loadPendingCounts, 30000);
});

watch(
  () => route.path,
  () => {
    loadPendingCounts();
  }
);

onBeforeUnmount(() => {
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
});
</script>
