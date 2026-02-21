<template>
  <section>
    <h2>Reports</h2>
    <div style="display:flex;gap:12px;align-items:center;">
      <a :href="capTableUrl" target="_blank">Download Cap Table CSV</a>
      <select v-model="meetingId"><option value="">Meeting for proxy report</option><option v-for="m in meetings" :value="m.id" :key="m.id">{{ m.title }}</option></select>
      <a v-if="meetingId" :href="proxyUrl" target="_blank">Download Meeting Proxy CSV</a>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api';

const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const meetingId = ref('');
const meetings = ref<any[]>([]);

const capTableUrl = computed(() => `${base}/reports/cap-table.csv`);
const proxyUrl = computed(() => `${base}/reports/meeting-proxy.csv?meetingId=${meetingId.value}`);

onMounted(async () => {
  meetings.value = (await api.get('/meetings')).data;
});
</script>
