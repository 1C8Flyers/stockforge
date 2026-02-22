<template>
  <div class="min-h-screen w-full bg-slate-100">
    <div class="flex min-h-screen w-full">
      <aside class="hidden w-64 border-r border-slate-200 bg-white p-4 md:block">
        <div class="mb-6 flex items-center gap-2">
          <img v-if="appLogoUrl" :src="appLogoUrl" alt="App logo" class="h-9 w-9 rounded object-cover" />
          <div>
            <div class="text-lg font-semibold text-slate-900">{{ appDisplayName }}</div>
            <div class="text-xs text-slate-500">StockForge</div>
          </div>
        </div>
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
            <button
              type="button"
              class="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50"
              @click="helpOpen = true"
            >
              Help
            </button>
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

        <footer class="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500 sm:px-6 sm:text-right">
          © {{ currentYear }} 1C8 Flyers, LLC. All rights reserved.
        </footer>
      </div>
    </div>

    <MobileNavDrawer :open="mobileNavOpen" :app-name="appDisplayName" :logo-url="appLogoUrl" @close="mobileNavOpen = false" />
    <HelpPanel :open="helpOpen" :page-title="pageTitle" :markdown="pageHelpMarkdown" @close="helpOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import SideNav from '../components/nav/SideNav.vue';
import MobileNavDrawer from '../components/nav/MobileNavDrawer.vue';
import HelpPanel from '../components/help/HelpPanel.vue';
import { api } from '../api';
import { getHelpMarkdown } from '../help';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const mobileNavOpen = ref(false);
const helpOpen = ref(false);
const appDisplayName = ref('StockForge');
const appLogoUrl = ref('');
const currentYear = new Date().getFullYear();

const routeTitleMap: Record<string, string> = {
  '/': 'Dashboard',
  '/shareholders': 'Shareholders',
  '/lots': 'Lots',
  '/transfers': 'Transfers',
  '/meetings': 'Meetings',
  '/reports': 'Reports',
  '/audit-log': 'Audit Log',
  '/user-manual': 'User Manual',
  '/admin': 'Admin'
};

const pageTitle = computed(() => {
  const metaTitle = route.meta?.title;
  if (typeof metaTitle === 'string') return metaTitle;
  return routeTitleMap[route.path] || appDisplayName.value;
});

const rolesText = computed(() => (auth.roles.length ? auth.roles.join(', ') : 'No role'));
const pageHelpMarkdown = computed(() => getHelpMarkdown(route.path));

const logout = () => {
  auth.clear();
  router.push('/login');
};

const loadBranding = async () => {
  try {
    const cfg = (await api.get('/config')).data as Record<string, string>;
    appDisplayName.value = cfg.appDisplayName || 'StockForge';
    appLogoUrl.value = cfg.appLogoUrl || '';
  } catch {
    appDisplayName.value = 'StockForge';
    appLogoUrl.value = '';
  }
};

const onBrandingUpdated = (event: Event) => {
  const customEvent = event as CustomEvent<{ appDisplayName?: string; appLogoUrl?: string }>;
  if (customEvent.detail?.appDisplayName) {
    appDisplayName.value = customEvent.detail.appDisplayName;
  }
  appLogoUrl.value = customEvent.detail?.appLogoUrl || '';
};

onMounted(() => {
  loadBranding();
  window.addEventListener('app-branding-updated', onBrandingUpdated as EventListener);
});

onBeforeUnmount(() => {
  window.removeEventListener('app-branding-updated', onBrandingUpdated as EventListener);
});
</script>
