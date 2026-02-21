<template>
  <section>
    <h2>Lots</h2>
    <p v-if="!canWrite" style="color:#666;">Read-only mode: create/edit actions are disabled.</p>
    <form v-if="canWrite" @submit.prevent="create" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <select v-model="form.ownerId">
        <option disabled value="">Owner</option>
        <option v-for="s in shareholders" :value="s.id" :key="s.id">{{ s.entityName || `${s.firstName || ''} ${s.lastName || ''}` }}</option>
      </select>
      <input v-model.number="form.shares" type="number" min="1" placeholder="Shares" />
      <input v-model="form.certificateNumber" placeholder="Certificate number" />
      <input v-model="form.notes" placeholder="Notes" />
      <select v-model="form.status"><option>Active</option><option>Disputed</option><option>Surrendered</option></select>
      <button>Add lot</button>
    </form>

    <table border="1" cellpadding="6" width="100%">
      <thead><tr><th>Owner</th><th>Certificate</th><th>Shares</th><th>Status</th><th>Source</th><th>Notes</th></tr></thead>
      <tbody><tr v-for="l in rows" :key="l.id"><td>{{ l.owner.entityName || `${l.owner.firstName || ''} ${l.owner.lastName || ''}` }}</td><td>{{ l.certificateNumber || '—' }}</td><td>{{ l.shares }}</td><td>{{ l.status }}</td><td>{{ l.source || '—' }}</td><td>{{ l.notes || '—' }}</td></tr></tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';

const rows = ref<any[]>([]);
const shareholders = ref<any[]>([]);
const form = ref({ ownerId: '', shares: 1, certificateNumber: '', notes: '', status: 'Active' });
const auth = useAuthStore();
const canWrite = computed(() => auth.canWrite);

const load = async () => {
  rows.value = (await api.get('/lots')).data;
  shareholders.value = (await api.get('/shareholders')).data;
};

const create = async () => {
  await api.post('/lots', {
    ...form.value,
    certificateNumber: form.value.certificateNumber || undefined,
    notes: form.value.notes || undefined
  });
  form.value = { ownerId: '', shares: 1, certificateNumber: '', notes: '', status: 'Active' };
  await load();
};

onMounted(load);
</script>
