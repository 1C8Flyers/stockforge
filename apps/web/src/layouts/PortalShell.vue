<template>
  <div class="min-h-screen bg-slate-50">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <div class="text-xs uppercase tracking-wide text-slate-500">Shareholder Portal</div>
          <div class="text-sm font-semibold text-slate-900">Tenant: {{ tenantSlug }}</div>
        </div>
        <nav class="flex flex-wrap items-center gap-2">
          <RouterLink v-for="item in links" :key="item.to" :to="item.to" class="rounded-md px-3 py-2 text-sm"
            :class="route.path === item.to ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100'">
            {{ item.label }}
          </RouterLink>
          <button class="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" @click="logout">
            Logout
          </button>
        </nav>
      </div>
    </header>
    <main class="mx-auto w-full max-w-6xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const tenantSlug = computed(() => String(route.params.tenantSlug || 'default'));
const basePath = computed(() => `/t/${tenantSlug.value}/portal`);

const links = computed(() => [
  { to: `${basePath.value}`, label: 'Dashboard' },
  { to: `${basePath.value}/holdings`, label: 'Holdings' },
  { to: `${basePath.value}/meetings`, label: 'Meetings' },
  { to: `${basePath.value}/proxies`, label: 'Proxies' },
  { to: `${basePath.value}/beneficiaries`, label: 'Beneficiaries' }
]);

function logout() {
  auth.clear();
  router.push(`/t/${tenantSlug.value}/portal/login`);
}
</script>
