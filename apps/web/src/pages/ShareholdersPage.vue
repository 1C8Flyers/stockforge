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
      <input v-model="form.phone" placeholder="Phone" />
      <input v-model="form.address1" placeholder="Street address 1" />
      <input v-model="form.address2" placeholder="Street address 2" />
      <input v-model="form.city" placeholder="City" />
      <input v-model="form.state" placeholder="State" />
      <input v-model="form.postalCode" placeholder="Postal code" />
      <button>Add</button>
    </form>

    <table border="1" cellpadding="6" width="100%">
      <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Email</th><th>Phone</th><th>Street Address</th></tr></thead>
      <tbody>
        <tr v-for="s in rows" :key="s.id">
          <td>{{ s.entityName || `${s.firstName || ''} ${s.lastName || ''}` }}</td>
          <td>{{ s.type }}</td>
          <td>{{ s.status }}</td>
          <td>{{ s.email }}</td>
          <td>{{ s.phone }}</td>
          <td>{{ [s.address1, s.address2, s.city, s.state, s.postalCode].filter(Boolean).join(', ') }}</td>
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
const form = ref({
  type: 'PERSON',
  firstName: '',
  lastName: '',
  entityName: '',
  email: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  postalCode: ''
});
const auth = useAuthStore();
const canWrite = computed(() => auth.canWrite);

const load = async () => {
  rows.value = (await api.get('/shareholders')).data;
};

const create = async () => {
  await api.post('/shareholders', { ...form.value, status: 'Active', tags: [] });
  form.value = {
    type: 'PERSON',
    firstName: '',
    lastName: '',
    entityName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: ''
  };
  await load();
};

onMounted(load);
</script>
