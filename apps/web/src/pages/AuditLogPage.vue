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
          <th>Entity ID</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>{{ new Date(row.createdAt).toLocaleString() }}</td>
          <td>{{ row.user?.email || row.userId }}</td>
          <td>{{ row.action }}</td>
          <td>{{ row.entityType }}</td>
          <td>{{ row.entityId }}</td>
          <td>
            <details>
              <summary>View</summary>
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
