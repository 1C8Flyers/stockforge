<template>
  <section class="space-y-4">
    <h2 class="text-xl font-semibold text-slate-900">Admin / Settings</h2>

    <Card class="p-0">
      <div class="flex flex-wrap gap-2 border-b border-slate-200 p-3">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition"
          :class="activeTab === tab.key ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
          @click="setTab(tab.key)"
        >
          <span>{{ tab.label }}</span>
          <Badge v-if="tabBadge(tab.key)" :tone="tabBadge(tab.key)!.tone">{{ tabBadge(tab.key)!.text }}</Badge>
        </button>
      </div>

      <div class="p-4">
        <Transition name="fade" mode="out-in">
          <component :is="activePanel" :key="activeTab" />
        </Transition>
      </div>
    </Card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { type AdminTab, useAdminStore } from '../stores/adminStore';
import Badge from '../components/ui/Badge.vue';
import Card from '../components/ui/Card.vue';
import AdminUsersPanel from '../components/admin/AdminUsersPanel.vue';
import AdminBrandingPanel from '../components/admin/AdminBrandingPanel.vue';
import AdminVotingPanel from '../components/admin/AdminVotingPanel.vue';
import AdminEmailPanel from '../components/admin/AdminEmailPanel.vue';
import AdminSystemPanel from '../components/admin/AdminSystemPanel.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const admin = useAdminStore();

if (!auth.isAdmin && !auth.isSystemAdmin) {
  router.push('/');
}

const tabs: Array<{ key: AdminTab; label: string }> = [
  { key: 'users', label: 'Users & Roles' },
  { key: 'branding', label: 'Branding' },
  { key: 'voting', label: 'Voting / Governance' },
  { key: 'email', label: 'Email' },
  { key: 'system', label: 'System' }
];

const validTabs = new Set<AdminTab>(tabs.map((tab) => tab.key));

const activeTab = computed<AdminTab>(() => {
  const tab = String(route.query.tab || 'users') as AdminTab;
  return validTabs.has(tab) ? tab : 'users';
});

const activePanel = computed(() => {
  if (activeTab.value === 'branding') return AdminBrandingPanel;
  if (activeTab.value === 'voting') return AdminVotingPanel;
  if (activeTab.value === 'email') return AdminEmailPanel;
  if (activeTab.value === 'system') return AdminSystemPanel;
  return AdminUsersPanel;
});

const setTab = (tab: AdminTab) => {
  if (tab === activeTab.value) return;
  router.replace({ query: { ...route.query, tab } });
};

const tabBadge = (tab: AdminTab): { text: string; tone: 'success' | 'warning' | 'danger' | 'muted' } | null => {
  if (tab === 'users') {
    return admin.userCount > 0 ? { text: String(admin.userCount), tone: 'muted' } : null;
  }

  if (tab === 'branding') {
    return admin.config.appDisplayName.trim() ? null : { text: '•', tone: 'warning' };
  }

  if (tab === 'voting') {
    return admin.votingStatus === 'warning' ? { text: '•', tone: 'warning' } : null;
  }

  if (tab === 'email') {
    if (admin.emailStatus === 'disabled') return { text: 'Disabled', tone: 'muted' };
    if (admin.emailStatus === 'invalid') return { text: 'Not Configured', tone: 'danger' };
    return { text: '•', tone: 'success' };
  }

  if (admin.systemStatus === 'error') return { text: 'Issue', tone: 'danger' };
  if (admin.systemStatus === 'warning') return { text: 'Migration', tone: 'warning' };
  return null;
};

watch(
  () => activeTab.value,
  async (tab) => {
    await admin.ensureTabLoaded(tab);
  },
  { immediate: true }
);

onMounted(async () => {
  await admin.ensureTabLoaded(activeTab.value);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
