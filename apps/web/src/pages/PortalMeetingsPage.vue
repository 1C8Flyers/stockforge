<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold text-slate-900">Meetings</h1>
    <p v-if="loading" class="text-sm text-slate-600">Loading...</p>
    <p v-else-if="error" class="text-sm text-rose-700">{{ error }}</p>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <Card>
        <h2 class="mb-2 text-sm font-semibold text-slate-700">Upcoming</h2>
        <ul class="space-y-2 text-sm">
          <li v-for="meeting in data?.upcoming || []" :key="meeting.id" class="rounded border border-slate-200 p-2">
            <div class="font-medium text-slate-900">{{ meeting.title }}</div>
            <div class="text-slate-600">{{ new Date(meeting.dateTime).toLocaleString() }}</div>
          </li>
          <li v-if="!(data?.upcoming || []).length" class="text-slate-500">No upcoming meetings.</li>
        </ul>
      </Card>

      <Card>
        <h2 class="mb-2 text-sm font-semibold text-slate-700">Recent</h2>
        <ul class="space-y-2 text-sm">
          <li v-for="meeting in data?.recent || []" :key="meeting.id" class="rounded border border-slate-200 p-2">
            <div class="font-medium text-slate-900">{{ meeting.title }}</div>
            <div class="text-slate-600">{{ new Date(meeting.dateTime).toLocaleString() }}</div>
          </li>
          <li v-if="!(data?.recent || []).length" class="text-slate-500">No recent meetings.</li>
        </ul>
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
    data.value = (await api.get(`/portal/t/${tenantSlug.value}/meetings`)).data;
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Unable to load meetings.';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
