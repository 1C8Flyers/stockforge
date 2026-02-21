<template>
  <nav class="space-y-1" aria-label="Main navigation">
    <RouterLink
      v-for="item in navItems"
      :key="item.path"
      :to="item.path"
      class="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition"
      :class="
        route.path === item.path
          ? 'bg-brand-100 text-brand-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      "
      @click="emit('navigate')"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const emit = defineEmits<{ (e: 'navigate'): void }>();
const route = useRoute();
const auth = useAuthStore();

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
</script>
