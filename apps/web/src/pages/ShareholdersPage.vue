<template>
  <section>
    <h2>Shareholders</h2>
    <p v-if="!canWrite" style="color:#666;">Read-only mode: create/edit actions are disabled.</p>
    <form v-if="canWrite" @submit.prevent="create" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <select v-model="form.type"><option value="PERSON">PERSON</option><option value="ENTITY">ENTITY</option></select>
      <input v-model="form.firstName" placeholder="First" />
      <input v-model="form.lastName" placeholder="Last" />
      <input v-model="form.entityName" placeholder="Entity" />
      <input v-model="form.email" placeholder="Email" />
      <button>Add</button>
    </form>

    <table border="1" cellpadding="6" width="100%">
      <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Email</th></tr></thead>
      <tbody>
        <tr v-for="s in rows" :key="s.id">
          <td>{{ s.entityName || `${s.firstName || ''} ${s.lastName || ''}` }}</td>
          <td>{{ s.type }}</td>
          <td>{{ s.status }}</td>
          <td>{{ s.email }}</td>
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
const form = ref({ type: 'PERSON', firstName: '', lastName: '', entityName: '', email: '' });
const auth = useAuthStore();
const canWrite = computed(() => auth.canWrite);

const load = async () => {
  rows.value = (await api.get('/shareholders')).data;
};

const create = async () => {
  await api.post('/shareholders', { ...form.value, status: 'Active', tags: [] });
  form.value = { type: 'PERSON', firstName: '', lastName: '', entityName: '', email: '' };
  await load();
};

onMounted(load);
</script>
