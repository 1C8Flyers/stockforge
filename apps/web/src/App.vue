<template>
  <RouterView v-if="route.path === '/login' || route.path === '/request-password-reset' || route.path === '/reset-password' || route.path.toLowerCase().startsWith('/verify/')" />
  <AppShell v-else>
    <RouterView />
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import AppShell from './layouts/AppShell.vue';

const route = useRoute();
const auth = useAuthStore();

onMounted(() => {
  if (route.path.toLowerCase().startsWith('/verify/') || route.path === '/request-password-reset' || route.path === '/reset-password') {
    return;
  }
  if (auth.isAuthed) {
    auth.hydrateUser();
  }
});
</script>
