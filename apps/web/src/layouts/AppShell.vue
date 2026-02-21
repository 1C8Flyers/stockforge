<template>
  <div class="min-h-screen w-full bg-slate-100">
    <div class="flex min-h-screen w-full">
      <aside class="hidden w-64 border-r border-slate-200 bg-white p-4 md:block">
        <div class="mb-6 text-lg font-semibold text-slate-900">StockForge</div>
        <SideNav />
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div class="flex min-h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              aria-label="Open navigation"
              class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 md:hidden"
              @click="mobileNavOpen = true"
            >
              ☰
            </button>
            <div class="min-w-0 flex-1">
              <h1 class="truncate text-lg font-semibold text-slate-900">{{ pageTitle }}</h1>
            </div>
            <slot name="headerActions" />
            <div class="hidden rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500 sm:block">{{ rolesText }}</div>
            <button
              type="button"
              class="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50"
              @click="logout"
            >
              Logout
            </button>
          </div>
        </header>

        <main class="flex-1 p-4 sm:p-6">
          <slot />
        </main>
      </div>
    </div>

    <MobileNavDrawer :open="mobileNavOpen" @close="mobileNavOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import SideNav from '../components/nav/SideNav.vue';
import MobileNavDrawer from '../components/nav/MobileNavDrawer.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const mobileNavOpen = ref(false);

const routeTitleMap: Record<string, string> = {
  '/': 'Dashboard',
  '/shareholders': 'Shareholders',
  '/lots': 'Lots',
  '/transfers': 'Transfers',
  '/meetings': 'Meetings',
  '/reports': 'Reports',
  '/audit-log': 'Audit Log',
  '/admin': 'Admin'
};

const pageTitle = computed(() => {
  const metaTitle = route.meta?.title;
  if (typeof metaTitle === 'string') return metaTitle;
  return routeTitleMap[route.path] || 'StockForge';
});

const rolesText = computed(() => (auth.roles.length ? auth.roles.join(', ') : 'No role'));

const logout = () => {
  auth.clear();
  router.push('/login');
};
</script>
