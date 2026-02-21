<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-slate-900">Dashboard</h2>
      <Button variant="secondary" @click="load" :loading="loading">Refresh</Button>
    </div>

    <LoadingState v-if="loading && !data" label="Loading dashboard..." />

    <template v-else-if="data">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p class="text-sm text-slate-500">Active Voting Shares</p>
          <p class="mt-2 text-3xl font-semibold text-slate-900">{{ data.activeVotingShares }}</p>
        </Card>
        <Card>
          <p class="text-sm text-slate-500">Majority Threshold</p>
          <p class="mt-2 text-3xl font-semibold text-slate-900">{{ data.majorityThreshold }}</p>
        </Card>
        <Card>
          <p class="text-sm text-slate-500">Excluded Shares</p>
          <p class="mt-2 text-3xl font-semibold text-slate-900">{{ totalExcluded }}</p>
        </Card>
        <Card>
          <p class="text-sm text-slate-500">Top Holder Shares</p>
          <p class="mt-2 text-3xl font-semibold text-slate-900">{{ data.topShareholders?.[0]?.activeShares ?? 0 }}</p>
        </Card>
      </div>

      <Card>
        <h3 class="text-base font-semibold text-slate-900">Exclusions Breakdown</h3>
        <div class="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-lg bg-slate-50 p-3">Owner Status: <b class="text-slate-900">{{ data.excludedBreakdown.excludedByOwner }}</b></div>
          <div class="rounded-lg bg-slate-50 p-3">Treasury: <b class="text-slate-900">{{ data.excludedBreakdown.excludedByTreasury }}</b></div>
          <div class="rounded-lg bg-slate-50 p-3">Surrendered: <b class="text-slate-900">{{ data.excludedBreakdown.excludedBySurrendered }}</b></div>
          <div class="rounded-lg bg-slate-50 p-3">Disputed: <b class="text-slate-900">{{ data.excludedBreakdown.excludedByDisputed }}</b></div>
        </div>
      </Card>

      <Card class="p-0">
        <div class="border-b border-slate-200 px-4 py-3">
          <h3 class="text-base font-semibold text-slate-900">Top Shareholders</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Active Shares</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              <tr v-for="row in data.topShareholders" :key="row.id">
                <td class="px-4 py-3 text-sm text-slate-900">{{ row.name }}</td>
                <td class="px-4 py-3 text-sm text-slate-700">{{ row.activeShares }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api';
import Button from '../components/ui/Button.vue';
import Card from '../components/ui/Card.vue';
import LoadingState from '../components/ui/LoadingState.vue';

const data = ref<any>(null);
const loading = ref(false);

const totalExcluded = computed(() => {
  if (!data.value) return 0;
  const b = data.value.excludedBreakdown;
  return (b.excludedByOwner || 0) + (b.excludedByTreasury || 0) + (b.excludedBySurrendered || 0) + (b.excludedByDisputed || 0);
});

const load = async () => {
  loading.value = true;
  try {
    const res = await api.get('/dashboard');
    data.value = res.data;
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>
