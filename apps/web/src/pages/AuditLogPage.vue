<template>
  <section>
    <h2>Audit Log</h2>
    <form @submit.prevent="load" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <input v-model="filters.entityType" placeholder="Entity type" />
      <input v-model="filters.action" placeholder="Action" />
      <input v-model="filters.userId" placeholder="User ID" />
      <input v-model="filters.from" type="datetime-local" />
      <input v-model="filters.to" type="datetime-local" />
      <input v-model.number="filters.limit" type="number" min="1" max="200" placeholder="Limit" />
      <button>Filter</button>
    </form>

    <table border="1" cellpadding="6" width="100%">
      <thead>
        <tr>
          <th>Time</th>
          <th>User</th>
          <th>Action</th>
          <th>Entity</th>
          <th>Record</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>{{ new Date(row.createdAt).toLocaleString() }}</td>
          <td>{{ row.user?.email || row.userId }}</td>
          <td>{{ actionLabel(row.action) }}</td>
          <td>{{ entityLabel(row.entityType) }}</td>
          <td>{{ shortId(row.entityId) }}</td>
          <td>
            <div>{{ summarizeDiff(row.diffJson) }}</div>
            <details>
              <summary>View raw</summary>
              <pre style="white-space:pre-wrap;max-width:600px;overflow:auto;">{{ pretty(row.diffJson) }}</pre>
            </details>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api';

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
