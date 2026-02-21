<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-slate-900">Lots</h2>
      <Button v-if="canWrite" type="button" @click="openCreateForm">Add lot</Button>
    </div>

    <p v-if="!canWrite" class="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">Read-only mode: create/edit actions are disabled.</p>

    <p v-if="printError" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ printError }}</p>

    <Teleport to="body">
      <div v-if="canWrite && formOpen" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-slate-900/50" @click="closeForm" />
        <div class="relative z-10 mx-auto mt-10 w-[min(1200px,95vw)]">
          <Card class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-slate-900">{{ editingId ? 'Edit lot' : 'Add lot' }}</h3>
              <Button type="button" variant="ghost" @click="closeForm">Close</Button>
            </div>
            <form @submit.prevent="save" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Select v-model="form.ownerId" label="Owner">
                <option disabled value="">Owner</option>
                <option v-for="s in shareholders" :key="s.id" :value="s.id">{{ s.entityName || `${s.firstName || ''} ${s.lastName || ''}` }}</option>
              </Select>
              <Input v-model="form.shares" type="number" min="1" label="Share Quantity" :disabled="!!editingId" />
              <Input v-model="form.certificateNumber" label="Certificate" :disabled="!!editingId" />
              <Select v-model="form.status" label="Status">
                <option>Active</option><option>Treasury</option><option>Disputed</option><option>Surrendered</option>
              </Select>
              <Input v-model="form.source" label="Source" />
              <Input v-model="form.notes" label="Notes" />
              <div class="flex items-end gap-2 sm:col-span-2 xl:col-span-2">
                <Button type="submit">{{ editingId ? 'Save lot' : 'Add lot' }}</Button>
                <Button type="button" variant="secondary" @click="closeForm">{{ editingId ? 'Cancel edit' : 'Cancel' }}</Button>
              </div>
            </form>
            <p v-if="editingId" class="text-sm text-slate-500">Certificate number and share quantity are locked after lot creation.</p>
          </Card>
        </div>
      </div>
    </Teleport>

    <Card>
      <Input v-model="search" label="Search" placeholder="Owner, certificate, status, source..." />
    </Card>

    <Card v-if="filteredRows.length" class="p-0">
      <div class="hidden overflow-x-auto md:block">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50"><tr><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Owner</th><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Certificate</th><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Shares</th><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Source</th><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Notes</th><th class="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            <tr v-for="l in filteredRows" :key="l.id"><td class="px-4 py-3 text-sm">{{ l.owner.entityName || `${l.owner.firstName || ''} ${l.owner.lastName || ''}` }}</td><td class="px-4 py-3 text-sm">{{ l.certificateNumber || '—' }}</td><td class="px-4 py-3 text-sm">{{ l.shares }}</td><td class="px-4 py-3 text-sm">{{ l.status }}</td><td class="px-4 py-3 text-sm">{{ l.source || '—' }}</td><td class="px-4 py-3 text-sm">{{ l.notes || '—' }}</td><td class="px-4 py-3 text-right"><div class="inline-flex gap-1"><Button v-if="canPrint" type="button" variant="ghost" :disabled="l.status !== 'Active' || printingLotId === l.id" @click="printCertificate(l, 'original')">Original</Button><Button v-if="canPrint" type="button" variant="ghost" :disabled="l.status !== 'Active' || printingLotId === l.id" @click="printCertificate(l, 'reprint')">Reprint</Button><Button v-if="canWrite" type="button" variant="ghost" @click="editLot(l)">Edit</Button></div></td></tr>
          </tbody>
        </table>
      </div>
      <div class="space-y-3 p-3 md:hidden">
        <article v-for="l in filteredRows" :key="l.id" class="rounded-xl border border-slate-200 p-3">
          <h3 class="font-medium text-slate-900">{{ l.owner.entityName || `${l.owner.firstName || ''} ${l.owner.lastName || ''}` }}</h3>
          <p class="text-sm text-slate-600">Cert: {{ l.certificateNumber || '—' }} · Shares: {{ l.shares }} · {{ l.status }}</p>
          <p class="text-sm text-slate-500">{{ l.source || '—' }} {{ l.notes ? `· ${l.notes}` : '' }}</p>
          <div class="mt-2 inline-flex gap-2">
            <Button v-if="canPrint" type="button" variant="ghost" :disabled="l.status !== 'Active' || printingLotId === l.id" @click="printCertificate(l, 'original')">Original</Button>
            <Button v-if="canPrint" type="button" variant="ghost" :disabled="l.status !== 'Active' || printingLotId === l.id" @click="printCertificate(l, 'reprint')">Reprint</Button>
            <Button v-if="canWrite" type="button" variant="ghost" @click="editLot(l)">Edit</Button>
          </div>
        </article>
      </div>
    </Card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';
import Button from '../components/ui/Button.vue';
import Card from '../components/ui/Card.vue';
import Input from '../components/ui/Input.vue';
import Select from '../components/ui/Select.vue';

const rows = ref<any[]>([]);
const shareholders = ref<any[]>([]);
const search = ref('');
const form = ref({ ownerId: '', shares: '', certificateNumber: '', source: '', notes: '', status: 'Active' });
const editingId = ref<string | null>(null);
const formOpen = ref(false);
const printError = ref('');
const printingLotId = ref('');
const auth = useAuthStore();
const canWrite = computed(() => auth.canWrite);
const canPrint = computed(() => auth.canPost);
const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter((l) =>
    [l.owner?.entityName, `${l.owner?.firstName || ''} ${l.owner?.lastName || ''}`, l.certificateNumber, l.status, l.source, l.notes]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  );
});

const load = async () => {
  rows.value = (await api.get('/lots')).data;
  shareholders.value = (await api.get('/shareholders')).data;
};

const clearForm = () => {
  editingId.value = null;
  form.value = { ownerId: '', shares: '', certificateNumber: '', source: '', notes: '', status: 'Active' };
};

const closeForm = () => {
  formOpen.value = false;
  clearForm();
};

const openCreateForm = () => {
  clearForm();
  printError.value = '';
  formOpen.value = true;
};

const extractPrintError = async (error: any) => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text) as { message?: string; error?: string };
      return json.message || json.error || 'Unable to print certificate.';
    } catch {
      return 'Unable to print certificate.';
    }
  }
  return data?.message || data?.error || 'Unable to print certificate.';
};

const printCertificate = async (lot: any, mode: 'original' | 'reprint') => {
  printError.value = '';
  printingLotId.value = lot.id;
  try {
    const response = await api.get(`/certificates/lots/${lot.id}.pdf`, { params: { mode }, responseType: 'blob' });
    const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error: any) {
    printError.value = await extractPrintError(error);
  } finally {
    printingLotId.value = '';
  }
};

const save = async () => {
  if (editingId.value) {
    const payload = {
      ownerId: form.value.ownerId,
      source: form.value.source || undefined,
      notes: form.value.notes || undefined,
      status: form.value.status
    };
    await api.put(`/lots/${editingId.value}`, payload);
  } else {
    const payload = {
      ...form.value,
      shares: Number(form.value.shares),
      certificateNumber: form.value.certificateNumber || undefined,
      source: form.value.source || undefined,
      notes: form.value.notes || undefined
    };
    await api.post('/lots', payload);
  }

  closeForm();
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
  formOpen.value = true;
};

onMounted(load);
</script>
