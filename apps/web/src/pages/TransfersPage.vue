<template>
  <section>
    <h2>Transfers</h2>
    <p v-if="!canWrite" style="color:#666;">Read-only mode: transfer drafting is disabled.</p>
    <p v-else-if="!canPost" style="color:#666;">Clerk mode: you can draft transfers but cannot post them.</p>
    <form v-if="canWrite" @submit.prevent="create" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <select v-model="form.fromOwnerId"><option value="">From owner</option><option v-for="s in shareholders" :key="s.id" :value="s.id">{{ displayName(s) }}</option></select>
      <select v-model="form.toOwnerId"><option value="">To owner</option><option v-for="s in shareholders" :key="s.id" :value="s.id">{{ displayName(s) }}</option></select>
      <select v-model="form.lotId"><option value="">Lot</option><option v-for="l in lots" :value="l.id" :key="l.id">{{ l.id.slice(0,8) }} - {{ l.shares }}</option></select>
      <input v-model.number="form.sharesTaken" type="number" min="1" placeholder="Shares" />
      <button>Create draft</button>
    </form>

    <table border="1" cellpadding="6" width="100%">
      <thead><tr><th>ID</th><th>Status</th><th>From</th><th>To</th><th>Lines</th><th>Actions</th></tr></thead>
      <tbody>
        <tr v-for="t in rows" :key="t.id">
          <td>{{ t.id.slice(0,8) }}</td><td>{{ t.status }}</td><td>{{ t.fromOwnerId }}</td><td>{{ t.toOwnerId }}</td><td>{{ t.lines.length }}</td>
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
const form = ref({ fromOwnerId: '', toOwnerId: '', lotId: '', sharesTaken: 1 });
const auth = useAuthStore();
const canWrite = computed(() => auth.canWrite);
const canPost = computed(() => auth.canPost);

const displayName = (s: any) => s.entityName || `${s.firstName || ''} ${s.lastName || ''}`;

const load = async () => {
  rows.value = (await api.get('/transfers')).data;
  shareholders.value = (await api.get('/shareholders')).data;
  lots.value = (await api.get('/lots')).data;
};

const create = async () => {
  await api.post('/transfers', {
    fromOwnerId: form.value.fromOwnerId || null,
    toOwnerId: form.value.toOwnerId || null,
    lines: [{ lotId: form.value.lotId, sharesTaken: form.value.sharesTaken }]
  });
  form.value = { fromOwnerId: '', toOwnerId: '', lotId: '', sharesTaken: 1 };
  await load();
};

const postTransfer = async (id: string) => {
  await api.post(`/transfers/${id}/post`);
  await load();
};

onMounted(load);
</script>
