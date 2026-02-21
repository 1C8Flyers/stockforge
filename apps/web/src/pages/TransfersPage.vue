<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">Transfers</h2>
        <p class="text-sm text-slate-600">Create draft transfers and post them when ready.</p>
      </div>
      <Button v-if="canWrite" @click="openCreateForm">Create transfer</Button>
    </div>

    <p v-if="!canWrite" class="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
      Read-only mode: transfer drafting is disabled.
    </p>
    <p v-else-if="!canPost" class="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
      Clerk mode: you can draft transfers but cannot post them.
    </p>

    <Card>
      <Input v-model="search" label="Search" placeholder="From, to, status, notes..." />
    </Card>

    <LoadingState v-if="isLoading" label="Loading transfers..." />
    <EmptyState v-else-if="filteredRows.length === 0" title="No transfers found" description="Create a transfer to get started." />

    <Card v-else class="p-0">
      <div class="hidden overflow-x-auto md:block">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">From</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">To</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Lines</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Posted</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            <tr v-for="t in filteredRows" :key="t.id">
              <td class="px-4 py-3 text-sm text-slate-600">{{ formatDate(t.transferDate || t.createdAt) }}</td>
              <td class="px-4 py-3"><Badge :tone="t.status === 'POSTED' ? 'success' : 'warning'">{{ t.status }}</Badge></td>
              <td class="px-4 py-3 text-sm text-slate-700">{{ displayName(t.fromOwner) || 'Retired Shares' }}</td>
              <td class="px-4 py-3 text-sm text-slate-700">{{ displayName(t.toOwner) || 'Retired Shares' }}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ formatLines(t.lines) }}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ t.postedAt ? formatDate(t.postedAt) : '—' }}</td>
              <td class="px-4 py-3 text-right">
                <DropdownMenu>
                  <template #default="{ close }">
                    <button
                      class="block min-h-11 w-full px-3 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="!canPost || t.status === 'POSTED'"
                      @click="postTransfer(t.id); close()"
                    >
                      Post
                    </button>
                    <button
                      v-if="canWrite"
                      class="block min-h-11 w-full px-3 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="t.status === 'POSTED'"
                      @click="editDraft(t); close()"
                    >
                      Edit
                    </button>
                    <button
                      v-if="canWrite"
                      class="block min-h-11 w-full px-3 text-left text-sm text-red-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="t.status === 'POSTED'"
                      @click="cancelDraft(t.id); close()"
                    >
                      Cancel draft
                    </button>
                  </template>
                </DropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="space-y-3 p-3 md:hidden">
        <article v-for="t in filteredRows" :key="t.id" class="rounded-xl border border-slate-200 p-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm text-slate-500">{{ formatDate(t.transferDate || t.createdAt) }}</p>
              <h3 class="text-sm font-medium text-slate-900">
                {{ displayName(t.fromOwner) || 'Retired Shares' }} → {{ displayName(t.toOwner) || 'Retired Shares' }}
              </h3>
              <p class="mt-1 text-sm text-slate-600">{{ formatLines(t.lines) }}</p>
              <p class="text-sm text-slate-500">{{ t.notes || '—' }}</p>
            </div>
            <div class="flex flex-col items-end gap-2">
              <Badge :tone="t.status === 'POSTED' ? 'success' : 'warning'">{{ t.status }}</Badge>
              <DropdownMenu>
                <template #default="{ close }">
                  <button
                    class="block min-h-11 w-full px-3 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="!canPost || t.status === 'POSTED'"
                    @click="postTransfer(t.id); close()"
                  >
                    Post
                  </button>
                  <button
                    v-if="canWrite"
                    class="block min-h-11 w-full px-3 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="t.status === 'POSTED'"
                    @click="editDraft(t); close()"
                  >
                    Edit
                  </button>
                  <button
                    v-if="canWrite"
                    class="block min-h-11 w-full px-3 text-left text-sm text-red-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="t.status === 'POSTED'"
                    @click="cancelDraft(t.id); close()"
                  >
                    Cancel draft
                  </button>
                </template>
              </DropdownMenu>
            </div>
          </div>
        </article>
      </div>
    </Card>

    <Teleport to="body">
      <div v-if="formOpen" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-slate-900/50" @click="clearForm" />
        <div class="relative z-10 mx-auto mt-10 w-[min(900px,95vw)]">
          <Card>
            <form class="space-y-4" @submit.prevent="save">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-slate-900">{{ editingId ? 'Edit transfer' : 'Create transfer' }}</h3>
                <Button type="button" variant="ghost" @click="clearForm">Close</Button>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <Select v-model="form.fromOwnerId" label="From owner">
                  <option disabled value="">From owner</option>
                  <option :value="RETIRED_VALUE">Retired Shares</option>
                  <option v-for="s in shareholders" :key="s.id" :value="s.id">{{ displayName(s) }}</option>
                </Select>
                <Select v-model="form.toOwnerId" label="To owner">
                  <option disabled value="">To owner</option>
                  <option :value="RETIRED_VALUE">Retired Shares</option>
                  <option v-for="s in shareholders" :key="s.id" :value="s.id">{{ displayName(s) }}</option>
                </Select>
                <Input v-model="form.transferDate" type="date" label="Transfer date" />
                <Select v-model="form.lotId" label="Source lot">
                  <option value="">Lot</option>
                  <option v-for="l in filteredLots" :key="l.id" :value="l.id">
                    {{ l.certificateNumber ? `Cert ${l.certificateNumber}` : `Lot ${l.id.slice(0, 8)}` }} - {{ l.shares }}
                  </option>
                </Select>
                <Input v-model="form.sharesTaken" type="number" min="1" label="Share quantity" placeholder="Share Quantity" />
                <Input v-model="form.notes" label="Notes" placeholder="Notes" />
              </div>

              <div class="flex justify-end gap-2">
                <Button type="button" variant="secondary" @click="clearForm">Cancel</Button>
                <Button type="submit" :loading="isSaving">{{ editingId ? 'Save transfer' : 'Create transfer' }}</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';
import Badge from '../components/ui/Badge.vue';
import Button from '../components/ui/Button.vue';
import Card from '../components/ui/Card.vue';
import DropdownMenu from '../components/ui/DropdownMenu.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import Input from '../components/ui/Input.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import Select from '../components/ui/Select.vue';

const rows = ref<any[]>([]);
const shareholders = ref<any[]>([]);
const lots = ref<any[]>([]);
const RETIRED_VALUE = '__RETIRED_SHARES__';
const form = ref({ fromOwnerId: '', toOwnerId: '', transferDate: '', lotId: '', sharesTaken: '', notes: '' });
const editingId = ref<string | null>(null);
const search = ref('');
const formOpen = ref(false);
const isLoading = ref(false);
const isSaving = ref(false);
const auth = useAuthStore();
const canWrite = computed(() => auth.canWrite);
const canPost = computed(() => auth.canPost);

const filteredLots = computed(() => {
  const from = form.value.fromOwnerId;
  if (!from || from === RETIRED_VALUE) return [];
  return lots.value.filter(
    (l) => l.ownerId === from && l.shares > 0 && (l.status === 'Active' || l.status === 'Disputed' || l.status === 'Treasury')
  );
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

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return rows.value;
  return rows.value.filter((t) =>
    [displayName(t.fromOwner), displayName(t.toOwner), t.status, t.notes, formatLines(t.lines)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  );
});

const load = async () => {
  isLoading.value = true;
  try {
    rows.value = (await api.get('/transfers')).data;
    shareholders.value = (await api.get('/shareholders')).data;
    lots.value = (await api.get('/lots')).data;
  } finally {
    isLoading.value = false;
  }
};

const openCreateForm = () => {
  clearForm();
  formOpen.value = true;
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
  formOpen.value = false;
};

const save = async () => {
  isSaving.value = true;
  try {
    const payload = {
      fromOwnerId: !form.value.fromOwnerId || form.value.fromOwnerId === RETIRED_VALUE ? null : form.value.fromOwnerId,
      toOwnerId: !form.value.toOwnerId || form.value.toOwnerId === RETIRED_VALUE ? null : form.value.toOwnerId,
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
  } finally {
    isSaving.value = false;
  }
};

const editDraft = (t: any) => {
  if (t.status === 'POSTED') return;
  const firstLine = t.lines?.[0];
  editingId.value = t.id;
  form.value = {
    fromOwnerId: t.fromOwnerId || RETIRED_VALUE,
    toOwnerId: t.toOwnerId || RETIRED_VALUE,
    transferDate: t.transferDate ? new Date(t.transferDate).toISOString().slice(0, 10) : '',
    lotId: firstLine?.lotId || '',
    sharesTaken: firstLine?.sharesTaken ? String(firstLine.sharesTaken) : '',
    notes: t.notes || ''
  };
  formOpen.value = true;
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
