<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold text-slate-900">Portal Dashboard</h1>

    <p v-if="loading" class="text-sm text-slate-600">Loading...</p>
    <p v-else-if="error" class="text-sm text-rose-700">{{ error }}</p>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <Card>
        <h2 class="text-sm font-semibold text-slate-700">Holdings</h2>
        <p class="mt-2 text-2xl font-bold text-slate-900">{{ data?.holdingsSummary?.activeShares ?? 0 }}</p>
        <p class="text-sm text-slate-600">Active shares</p>
      </Card>

      <Card>
        <h2 class="text-sm font-semibold text-slate-700">Proxy Status</h2>
        <p class="mt-2 text-sm text-slate-800">
          {{ data?.activeProxy ? `${data.activeProxy.proxyType} (${data.activeProxy.status})` : 'No active proxy' }}
        </p>
      </Card>

      <Card>
        <h2 class="text-sm font-semibold text-slate-700">Next Meeting</h2>
        <p class="mt-2 text-sm text-slate-800">{{ data?.nextMeeting ? data.nextMeeting.title : 'No upcoming meeting' }}</p>
      </Card>

      <Card>
        <h2 class="text-sm font-semibold text-slate-700">Beneficiary Designation</h2>
        <p class="mt-2 text-sm text-slate-800">{{ data?.designationStatus || 'Not started' }}</p>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api';
import Card from '../components/ui/Card.vue';
import { getTenantSlug } from '../portalTenant';

const route = useRoute();
const tenantSlug = computed(() => getTenantSlug(route));

const data = ref<any>(null);
const loading = ref(false);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    data.value = (await api.get(`/portal/t/${tenantSlug.value}/me`)).data;
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Unable to load portal dashboard.';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
