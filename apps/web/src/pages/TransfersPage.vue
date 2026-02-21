<template>
  <section>
    <h2>Transfers</h2>
    <p v-if="!canWrite" style="color:#666;">Read-only mode: transfer drafting is disabled.</p>
    <p v-else-if="!canPost" style="color:#666;">Clerk mode: you can draft transfers but cannot post them.</p>
    <form v-if="canWrite" @submit.prevent="save" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
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
      <select v-model="form.lotId">
        <option value="">Lot</option>
        <option v-for="l in filteredLots" :value="l.id" :key="l.id">{{ l.certificateNumber ? `Cert ${l.certificateNumber}` : `Lot ${l.id.slice(0,8)}` }} - {{ l.shares }}</option>
      </select>
      <input v-model="form.sharesTaken" type="number" min="1" placeholder="Share Quantity" />
      <input v-model="form.notes" placeholder="Notes" />
      <button>{{ editingId ? 'Save draft' : 'Create draft' }}</button>
      <button v-if="editingId" type="button" @click="clearForm">Cancel edit</button>
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
          <td>
            <button @click="postTransfer(t.id)" :disabled="!canPost || t.status==='POSTED'">Post</button>
            <button v-if="canWrite" @click="editDraft(t)" :disabled="t.status==='POSTED'">Edit</button>
            <button v-if="canWrite" @click="cancelDraft(t.id)" :disabled="t.status==='POSTED'">Cancel</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';

const rows = ref<any[]>([]);
const shareholders = ref<any[]>([]);
const lots = ref<any[]>([]);
const CORPORATION_VALUE = '__CORPORATION__';
const form = ref({ fromOwnerId: '', toOwnerId: '', transferDate: '', lotId: '', sharesTaken: '', notes: '' });
const editingId = ref<string | null>(null);
const auth = useAuthStore();
const canWrite = computed(() => auth.canWrite);
const canPost = computed(() => auth.canPost);
const filteredLots = computed(() => {
  const from = form.value.fromOwnerId;
  if (!from || from === CORPORATION_VALUE) return [];
  return lots.value.filter((l) => l.ownerId === from && l.shares > 0 && (l.status === 'Active' || l.status === 'Disputed'));
});

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

watch(
  () => form.value.fromOwnerId,
  () => {
    form.value.lotId = '';
  }
);

const clearForm = () => {
  editingId.value = null;
  form.value = { fromOwnerId: '', toOwnerId: '', transferDate: '', lotId: '', sharesTaken: '', notes: '' };
};

const save = async () => {
  const payload = {
    fromOwnerId: !form.value.fromOwnerId || form.value.fromOwnerId === CORPORATION_VALUE ? null : form.value.fromOwnerId,
    toOwnerId: !form.value.toOwnerId || form.value.toOwnerId === CORPORATION_VALUE ? null : form.value.toOwnerId,
    transferDate: form.value.transferDate ? new Date(form.value.transferDate).toISOString() : undefined,
    notes: form.value.notes || undefined,
    lines: [{ lotId: form.value.lotId, sharesTaken: Number(form.value.sharesTaken) }]
  };

  if (editingId.value) {
    await api.put(`/transfers/${editingId.value}`, payload);
  } else {
    await api.post('/transfers', payload);
  }

  clearForm();
  await load();
};

const editDraft = (t: any) => {
  if (t.status === 'POSTED') return;
  const firstLine = t.lines?.[0];
  editingId.value = t.id;
  form.value = {
    fromOwnerId: t.fromOwnerId || CORPORATION_VALUE,
    toOwnerId: t.toOwnerId || CORPORATION_VALUE,
    transferDate: t.transferDate ? new Date(t.transferDate).toISOString().slice(0, 10) : '',
    lotId: firstLine?.lotId || '',
    sharesTaken: firstLine?.sharesTaken ? String(firstLine.sharesTaken) : '',
    notes: t.notes || ''
  };
};

const cancelDraft = async (id: string) => {
  await api.delete(`/transfers/${id}`);
  if (editingId.value === id) clearForm();
  await load();
};

const postTransfer = async (id: string) => {
  await api.post(`/transfers/${id}/post`);
  await load();
};

onMounted(load);
</script>
