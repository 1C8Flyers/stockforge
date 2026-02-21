<template>
  <RouterView v-if="route.path === '/login' || route.path.toLowerCase().startsWith('/verify/')" />
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
  if (auth.isAuthed) {
    auth.hydrateUser();
  }
});
</script>
