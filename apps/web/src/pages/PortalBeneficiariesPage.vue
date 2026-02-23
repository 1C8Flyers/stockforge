<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold text-slate-900">Beneficiary Designation</h1>

    <Card class="space-y-3">
      <div class="text-sm text-slate-700">Status: <b>{{ designation?.status || 'DRAFT' }}</b></div>

      <div v-for="(entry, index) in entries" :key="index" class="grid gap-2 rounded border border-slate-200 p-3 md:grid-cols-4">
        <Input v-model="entry.name" label="Name" />
        <Input v-model="entry.relationship" label="Relationship" />
        <Input v-model="entry.email" label="Email" />
        <Input v-model="entry.percent" type="number" label="Percent" min="0" max="100" />
      </div>

      <Button variant="secondary" @click="addEntry">Add beneficiary</Button>

      <div class="text-sm text-slate-600">Total: {{ totalPercent }}%</div>
      <p v-if="error" class="text-sm text-rose-700">{{ error }}</p>

      <div class="flex flex-wrap gap-2">
        <Button :loading="saving" @click="save(false)">Save Draft</Button>
        <Button :loading="saving" variant="secondary" @click="save(true)">Save + Submit</Button>
        <Button v-if="designation?.id" :loading="saving" variant="ghost" @click="submitExisting">Submit Existing</Button>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api';
import Card from '../components/ui/Card.vue';
import Input from '../components/ui/Input.vue';
import Button from '../components/ui/Button.vue';
import { getTenantSlug } from '../portalTenant';

const route = useRoute();
const tenantSlug = computed(() => getTenantSlug(route));

const designation = ref<any>(null);
const entries = ref<Array<{ name: string; relationship: string; email: string; percent: number }>>([]);
const error = ref('');
const saving = ref(false);

const totalPercent = computed(() => entries.value.reduce((sum, row) => sum + Number(row.percent || 0), 0));

function addEntry() {
  entries.value.push({ name: '', relationship: '', email: '', percent: 0 });
}

async function load() {
  error.value = '';
  const data = (await api.get(`/portal/t/${tenantSlug.value}/beneficiaries`)).data;
  designation.value = data;
  entries.value = (data?.entries || []).map((row: any) => ({
    name: row.name || '',
    relationship: row.relationship || '',
    email: row.email || '',
    percent: Number(row.percent || 0)
  }));
  if (!entries.value.length) addEntry();
}

async function save(submit: boolean) {
  saving.value = true;
  error.value = '';
  try {
    const payload = {
      designationId: designation.value?.id,
      submit,
      entries: entries.value.map((row) => ({
        name: row.name,
        relationship: row.relationship || null,
        email: row.email || null,
        percent: Number(row.percent || 0)
      }))
    };
    designation.value = (await api.post(`/portal/t/${tenantSlug.value}/beneficiaries`, payload)).data;
    await load();
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Unable to save beneficiaries.';
  } finally {
    saving.value = false;
  }
}

async function submitExisting() {
  if (!designation.value?.id) return;
  saving.value = true;
  error.value = '';
  try {
    await api.post(`/portal/t/${tenantSlug.value}/beneficiaries/${designation.value.id}/submit`);
    await load();
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Unable to submit designation.';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
