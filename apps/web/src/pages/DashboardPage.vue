<template>
  <section>
    <h2>Dashboard</h2>
    <button @click="load">Refresh</button>
    <div v-if="data" style="display:grid;gap:10px;margin-top:10px;">
      <div>Active voting shares: <b>{{ data.activeVotingShares }}</b></div>
      <div>Majority threshold: <b>{{ data.majorityThreshold }}</b></div>
      <div>
        Excluded: Owner {{ data.excludedBreakdown.excludedByOwner }}, Surrendered {{ data.excludedBreakdown.excludedBySurrendered }}, Disputed {{ data.excludedBreakdown.excludedByDisputed }}
      </div>
      <h3>Top Shareholders</h3>
      <table border="1" cellpadding="6">
        <thead><tr><th>Name</th><th>Active Shares</th></tr></thead>
        <tbody><tr v-for="row in data.topShareholders" :key="row.id"><td>{{ row.name }}</td><td>{{ row.activeShares }}</td></tr></tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api';

const data = ref<any>(null);
const load = async () => {
  const res = await api.get('/dashboard');
  data.value = res.data;
};
onMounted(load);
</script>
