<template>
  <section>
    <h2>Transfers</h2>
    <p v-if="!canWrite" style="color:#666;">Read-only mode: transfer drafting is disabled.</p>
    <p v-else-if="!canPost" style="color:#666;">Clerk mode: you can draft transfers but cannot post them.</p>
    <form v-if="canWrite" @submit.prevent="create" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <select v-model="form.fromOwnerId">
        <option disabled value="">From owner</option>
        <option :value="CORPORATION_VALUE">Corporation</option>
        <option v-for="s in shareholders" :key="s.id" :value="s.id">{{ displayName(s) }}</option>
      </select>
      <select v-model="form.toOwnerId">
        <option disabled value="">To owner</option>
        <option :value="CORPORATION_VALUE">Corporation</option>
        <option v-for="s in shareholders" :key="s.id" :value="s.id">{{ displayName(s) }}</option>
      </select>
      <input v-model="form.transferDate" type="date" />
      <select v-model="form.lotId"><option value="">Lot</option><option v-for="l in lots" :value="l.id" :key="l.id">{{ l.certificateNumber ? `Cert ${l.certificateNumber}` : `Lot ${l.id.slice(0,8)}` }} - {{ l.shares }}</option></select>
      <input v-model.number="form.sharesTaken" type="number" min="1" placeholder="Shares" />
      <input v-model="form.notes" placeholder="Notes" />
      <button>Create draft</button>
    </form>

    <table border="1" cellpadding="6" width="100%">
      <thead><tr><th>Date</th><th>Status</th><th>From</th><th>To</th><th>Lines</th><th>Notes</th><th>Posted</th><th>Actions</th></tr></thead>
      <tbody>
        <tr v-for="t in rows" :key="t.id">
          <td>{{ formatDate(t.transferDate || t.createdAt) }}</td>
          <td>{{ t.status }}</td>
          <td>{{ displayName(t.fromOwner) || 'Corporation' }}</td>
          <td>{{ displayName(t.toOwner) || 'Corporation' }}</td>
          <td>{{ formatLines(t.lines) }}</td>
          <td>{{ t.notes || '—' }}</td>
          <td>{{ t.postedAt ? formatDate(t.postedAt) : '—' }}</td>
          <td><button @click="postTransfer(t.id)" :disabled="!canPost || t.status==='POSTED'">Post</button></td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';

const rows = ref<any[]>([]);
const shareholders = ref<any[]>([]);
const lots = ref<any[]>([]);
const CORPORATION_VALUE = '__CORPORATION__';
const form = ref({ fromOwnerId: '', toOwnerId: '', transferDate: '', lotId: '', sharesTaken: 1, notes: '' });
const auth = useAuthStore();
const canWrite = computed(() => auth.canWrite);
const canPost = computed(() => auth.canPost);

const displayName = (s: any) => (s ? s.entityName || `${s.firstName || ''} ${s.lastName || ''}`.trim() : '');
const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '—');
const formatLines = (lines: any[]) =>
  lines
    .map((l) => {
      const cert = l.lot?.certificateNumber ? `Cert ${l.lot.certificateNumber}` : `Lot ${String(l.lotId).slice(0, 8)}`;
      return `${l.sharesTaken} from ${cert}`;
    })
    .join('; ');

const load = async () => {
  rows.value = (await api.get('/transfers')).data;
  shareholders.value = (await api.get('/shareholders')).data;
  lots.value = (await api.get('/lots')).data;
};

const create = async () => {
  await api.post('/transfers', {
    fromOwnerId: !form.value.fromOwnerId || form.value.fromOwnerId === CORPORATION_VALUE ? null : form.value.fromOwnerId,
    toOwnerId: !form.value.toOwnerId || form.value.toOwnerId === CORPORATION_VALUE ? null : form.value.toOwnerId,
    transferDate: form.value.transferDate ? new Date(form.value.transferDate).toISOString() : undefined,
    notes: form.value.notes || undefined,
    lines: [{ lotId: form.value.lotId, sharesTaken: form.value.sharesTaken }]
  });
  form.value = { fromOwnerId: '', toOwnerId: '', transferDate: '', lotId: '', sharesTaken: 1, notes: '' };
  await load();
};

const postTransfer = async (id: string) => {
  await api.post(`/transfers/${id}/post`);
  await load();
};

onMounted(load);
</script>
