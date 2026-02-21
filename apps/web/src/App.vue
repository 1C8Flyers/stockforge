<template>
  <div>
    <nav v-if="isAuthed" style="display:flex;gap:12px;padding:12px;border-bottom:1px solid #ddd;align-items:center;">
      <router-link to="/">Dashboard</router-link>
      <router-link to="/shareholders">Shareholders</router-link>
      <router-link to="/lots">Lots</router-link>
      <router-link to="/transfers">Transfers</router-link>
      <router-link to="/meetings">Meetings/Proxies</router-link>
      <router-link to="/reports">Reports</router-link>
      <span style="margin-left:auto;color:#555;font-size:12px;">{{ rolesText }}</span>
      <button @click="logout" style="margin-left:auto">Logout</button>
    </nav>
    <main style="padding:16px;max-width:1100px;margin:0 auto;">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';

const router = useRouter();
const auth = useAuthStore();
const isAuthed = computed(() => auth.isAuthed);
const rolesText = computed(() => (auth.roles.length ? auth.roles.join(', ') : 'No role'));

onMounted(() => {
  if (auth.isAuthed) {
    auth.hydrateUser();
  }
});

const logout = () => {
  auth.clear();
  router.push('/login');
};
</script>
