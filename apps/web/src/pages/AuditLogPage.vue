<template>
  <section class="space-y-4">
    <h2 class="text-xl font-semibold text-slate-900">Audit Log</h2>
    <Card>
      <form @submit.prevent="load" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Input v-model="filters.entityType" label="Entity type" />
        <Input v-model="filters.action" label="Action" />
        <Input v-model="filters.userId" label="User ID" />
        <Input v-model="filters.from" type="datetime-local" label="From" />
        <Input v-model="filters.to" type="datetime-local" label="To" />
        <div class="flex items-end gap-2">
          <Input v-model="filters.limit" type="number" min="1" max="200" label="Limit" />
          <Button type="submit">Filter</Button>
        </div>
      </form>
    </Card>

    <Card class="p-0">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Time</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">User</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Action</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Entity</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Record</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Details</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            <tr v-for="row in rows" :key="row.id">
              <td class="px-4 py-3 text-sm text-slate-700">{{ new Date(row.createdAt).toLocaleString() }}</td>
              <td class="px-4 py-3 text-sm text-slate-700">{{ row.user?.email || row.userId }}</td>
              <td class="px-4 py-3 text-sm text-slate-700">{{ actionLabel(row.action) }}</td>
              <td class="px-4 py-3 text-sm text-slate-700">{{ entityLabel(row.entityType) }}</td>
              <td class="px-4 py-3 text-sm text-slate-700">{{ shortId(row.entityId) }}</td>
              <td class="px-4 py-3 text-sm text-slate-700">
                <div>{{ summarizeDiff(row.diffJson) }}</div>
                <details>
                  <summary class="cursor-pointer text-slate-500">View raw</summary>
                  <pre class="max-w-[600px] overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs">{{ pretty(row.diffJson) }}</pre>
                </details>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api';
import Button from '../components/ui/Button.vue';
import Card from '../components/ui/Card.vue';
import Input from '../components/ui/Input.vue';

const rows = ref<any[]>([]);
const filters = ref({ entityType: '', action: '', userId: '', from: '', to: '', limit: 100 });

const toIsoOrUndefined = (v: string) => (v ? new Date(v).toISOString() : undefined);
const pretty = (v: unknown) => JSON.stringify(v ?? {}, null, 2);
const shortId = (id: string) => (id ? `${id.slice(0, 8)}…` : '—');
const actionLabel = (action: string) => {
  const map: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    POST: 'Posted'
  };
  return map[action] || action;
};
const entityLabel = (entityType: string) => entityType.replace(/([a-z])([A-Z])/g, '$1 $2');
const summarizeDiff = (diff: any) => {
  if (!diff) return 'No details';
  if (typeof diff !== 'object') return String(diff);

  if (diff.before && diff.after && typeof diff.before === 'object' && typeof diff.after === 'object') {
    const changed = Object.keys(diff.after).filter((k) => JSON.stringify(diff.before[k]) !== JSON.stringify(diff.after[k]));
    return changed.length ? `Changed: ${changed.join(', ')}` : 'Updated record';
  }

  const keys = Object.keys(diff);
  return keys.length ? `Fields: ${keys.join(', ')}` : 'No details';
};

const load = async () => {
  const params: Record<string, string | number> = { limit: filters.value.limit || 100 };
  if (filters.value.entityType) params.entityType = filters.value.entityType;
  if (filters.value.action) params.action = filters.value.action;
  if (filters.value.userId) params.userId = filters.value.userId;
  const fromIso = toIsoOrUndefined(filters.value.from);
  const toIso = toIsoOrUndefined(filters.value.to);
  if (fromIso) params.from = fromIso;
  if (toIso) params.to = toIso;

  rows.value = (await api.get('/audit-log', { params })).data;
};

onMounted(load);
</script>
