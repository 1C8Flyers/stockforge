<template>
  <section class="space-y-4">
    <h2 class="text-xl font-semibold text-slate-900">Reports</h2>
    <Card class="space-y-3">
      <p class="text-sm text-slate-600">Download compliance and meeting exports.</p>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <a :href="capTableUrl" target="_blank" class="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">Download Cap Table CSV</a>
        <div class="min-w-[260px] flex-1">
          <Select v-model="meetingId" label="Meeting for proxy report">
            <option value="">Meeting for proxy report</option>
            <option v-for="m in meetings" :value="m.id" :key="m.id">{{ m.title }}</option>
          </Select>
        </div>
        <a v-if="meetingId" :href="proxyUrl" target="_blank" class="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Download Meeting Proxy CSV</a>
      </div>
    </Card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api';
import Card from '../components/ui/Card.vue';
import Select from '../components/ui/Select.vue';

const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const meetingId = ref('');
const meetings = ref<any[]>([]);

const capTableUrl = computed(() => `${base}/reports/cap-table.csv`);
const proxyUrl = computed(() => `${base}/reports/meeting-proxy.csv?meetingId=${meetingId.value}`);

onMounted(async () => {
  meetings.value = (await api.get('/meetings')).data;
});
</script>
