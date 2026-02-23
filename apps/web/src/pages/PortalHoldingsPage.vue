<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold text-slate-900">My Holdings</h1>
    <p v-if="loading" class="text-sm text-slate-600">Loading...</p>
    <p v-else-if="error" class="text-sm text-rose-700">{{ error }}</p>

    <Card v-else>
      <div class="mb-3 text-sm text-slate-700">
        Total shares: <b>{{ data?.totalShares ?? 0 }}</b> · Active shares: <b>{{ data?.activeShares ?? 0 }}</b>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-slate-600">
              <th class="px-2 py-2">Certificate</th>
              <th class="px-2 py-2">Shares</th>
              <th class="px-2 py-2">Status</th>
              <th class="px-2 py-2">Acquired</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lot in data?.lots || []" :key="lot.id" class="border-b border-slate-100">
              <td class="px-2 py-2">{{ lot.certificateNumber || lot.id }}</td>
              <td class="px-2 py-2">{{ lot.shares }}</td>
              <td class="px-2 py-2">{{ lot.status }}</td>
              <td class="px-2 py-2">{{ lot.acquiredDate ? new Date(lot.acquiredDate).toLocaleDateString() : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api';
import Card from '../components/ui/Card.vue';

const route = useRoute();
const tenantSlug = computed(() => String(route.params.tenantSlug || 'default'));
const data = ref<any>(null);
const loading = ref(false);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    data.value = (await api.get(`/portal/t/${tenantSlug.value}/holdings`)).data;
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Unable to load holdings.';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
