<template>
  <RouterView
    v-if="
      route.path === '/login' ||
      route.path === '/request-password-reset' ||
      route.path === '/reset-password' ||
      route.path.toLowerCase().startsWith('/verify/') ||
      route.path.toLowerCase().endsWith('/portal/login')
    "
  />
  <PortalShell v-else-if="isPortalRoute">
    <RouterView />
  </PortalShell>
  <AppShell v-else>
    <RouterView />
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import AppShell from './layouts/AppShell.vue';
import PortalShell from './layouts/PortalShell.vue';

const route = useRoute();
const auth = useAuthStore();
const isPortalRoute = computed(() => route.path.toLowerCase().includes('/portal'));

onMounted(() => {
  if (route.path.toLowerCase().startsWith('/verify/') || route.path === '/request-password-reset' || route.path === '/reset-password') {
    return;
  }
  if (auth.isAuthed) {
    auth.hydrateUser();
  }
});
</script>
