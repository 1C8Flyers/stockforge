<template>
  <section>
    <h2>Lots</h2>
    <p v-if="!canWrite" style="color:#666;">Read-only mode: create/edit actions are disabled.</p>
    <form v-if="canWrite" @submit.prevent="save" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <select v-model="form.ownerId">
        <option disabled value="">Owner</option>
        <option v-for="s in shareholders" :value="s.id" :key="s.id">{{ s.entityName || `${s.firstName || ''} ${s.lastName || ''}` }}</option>
      </select>
      <input v-model="form.shares" type="number" min="1" placeholder="Share Quantity" />
      <input v-model="form.certificateNumber" placeholder="Certificate number" />
      <input v-model="form.source" placeholder="Source" />
      <input v-model="form.notes" placeholder="Notes" />
      <select v-model="form.status"><option>Active</option><option>Disputed</option><option>Surrendered</option></select>
      <button>{{ editingId ? 'Save lot' : 'Add lot' }}</button>
      <button v-if="editingId" type="button" @click="clearForm">Cancel edit</button>
    </form>

    <table border="1" cellpadding="6" width="100%">
      <thead><tr><th>Owner</th><th>Certificate</th><th>Shares</th><th>Status</th><th>Source</th><th>Notes</th><th>Actions</th></tr></thead>
      <tbody><tr v-for="l in rows" :key="l.id"><td>{{ l.owner.entityName || `${l.owner.firstName || ''} ${l.owner.lastName || ''}` }}</td><td>{{ l.certificateNumber || '—' }}</td><td>{{ l.shares }}</td><td>{{ l.status }}</td><td>{{ l.source || '—' }}</td><td>{{ l.notes || '—' }}</td><td><button v-if="canWrite" type="button" @click="editLot(l)">Edit</button></td></tr></tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';

const rows = ref<any[]>([]);
const shareholders = ref<any[]>([]);
const form = ref({ ownerId: '', shares: '', certificateNumber: '', source: '', notes: '', status: 'Active' });
const editingId = ref<string | null>(null);
const auth = useAuthStore();
const canWrite = computed(() => auth.canWrite);

const load = async () => {
  rows.value = (await api.get('/lots')).data;
  shareholders.value = (await api.get('/shareholders')).data;
};

const clearForm = () => {
  editingId.value = null;
  form.value = { ownerId: '', shares: '', certificateNumber: '', source: '', notes: '', status: 'Active' };
};

const save = async () => {
  const payload = {
    ...form.value,
    shares: Number(form.value.shares),
    certificateNumber: form.value.certificateNumber || undefined,
    source: form.value.source || undefined,
    notes: form.value.notes || undefined
  };

  if (editingId.value) {
    await api.put(`/lots/${editingId.value}`, payload);
  } else {
    await api.post('/lots', payload);
  }

  clearForm();
  await load();
};

const editLot = (l: any) => {
  editingId.value = l.id;
  form.value = {
    ownerId: l.ownerId,
    shares: String(l.shares),
    certificateNumber: l.certificateNumber || '',
    source: l.source || '',
    notes: l.notes || '',
    status: l.status
  };
};

onMounted(load);
</script>
