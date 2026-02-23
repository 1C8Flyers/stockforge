<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">Shareholders</h2>
        <p class="text-sm text-slate-600">Manage people and entities that hold shares.</p>
      </div>
      <Button v-if="canWrite" @click="openCreateDrawer">Add shareholder</Button>
    </div>

    <p v-if="!canWrite" class="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
      Read-only mode: create/edit actions are disabled.
    </p>

    <p v-if="deleteError" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ deleteError }}
    </p>

    <Card>
      <Input v-model="search" label="Search" placeholder="Name, email, phone, city..." />
    </Card>

    <LoadingState v-if="isLoading" label="Loading shareholders..." />
    <EmptyState v-else-if="filteredRows.length === 0" title="No shareholders found" description="Create a shareholder to get started." />

    <Card v-else class="p-0">
      <div class="hidden overflow-x-auto md:block">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Portal User</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Address</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            <tr v-for="s in filteredRows" :key="s.id">
              <td class="px-4 py-3 text-sm text-slate-900">{{ displayName(s) }}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ s.type }}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ s.status }}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ linkedPortalEmail(s) }}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ [s.email, s.phone].filter(Boolean).join(' · ') || '—' }}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ displayAddress(s) }}</td>
              <td class="px-4 py-3 text-right">
                <DropdownMenu v-if="canWrite">
                  <template #default="{ close }">
                    <button class="block min-h-11 w-full px-3 text-left text-sm hover:bg-slate-50" @click="startEdit(s); close()">Edit</button>
                    <button
                      v-if="canDelete"
                      class="block min-h-11 w-full px-3 text-left text-sm text-red-600 hover:bg-slate-50"
                      @click="askDelete(s); close()"
                    >
                      Delete
                    </button>
                  </template>
                </DropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="space-y-3 p-3 md:hidden">
        <article v-for="s in filteredRows" :key="s.id" class="rounded-xl border border-slate-200 p-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-medium text-slate-900">{{ displayName(s) }}</h3>
              <p class="text-sm text-slate-600">{{ s.type }} · {{ s.status }}</p>
            </div>
            <DropdownMenu v-if="canWrite">
              <template #default="{ close }">
                <button class="block min-h-11 w-full px-3 text-left text-sm hover:bg-slate-50" @click="startEdit(s); close()">Edit</button>
                <button
                  v-if="canDelete"
                  class="block min-h-11 w-full px-3 text-left text-sm text-red-600 hover:bg-slate-50"
                  @click="askDelete(s); close()"
                >
                  Delete
                </button>
              </template>
            </DropdownMenu>
          </div>
          <p class="mt-1 text-sm text-slate-500">Portal user: {{ linkedPortalEmail(s) }}</p>
          <p class="mt-2 text-sm text-slate-600">{{ [s.email, s.phone].filter(Boolean).join(' · ') || 'No contact info' }}</p>
          <p class="mt-1 text-sm text-slate-500">{{ displayAddress(s) }}</p>
        </article>
      </div>
    </Card>

    <Drawer :open="drawerOpen" @close="cancelEdit">
      <form class="flex h-full flex-col" @submit.prevent="save">
        <div class="flex items-center justify-between border-b border-slate-200 p-4">
          <h3 class="text-base font-semibold">{{ editingId ? 'Edit shareholder' : 'Create shareholder' }}</h3>
          <button type="button" aria-label="Close drawer" class="min-h-11 min-w-11 rounded-lg border border-slate-300" @click="cancelEdit">✕</button>
        </div>

        <div class="flex-1 space-y-3 overflow-y-auto p-4">
          <Select v-model="form.type" label="Type">
            <option value="PERSON">PERSON</option>
            <option value="ENTITY">ENTITY</option>
          </Select>

          <div class="grid gap-3 sm:grid-cols-2">
            <Input v-model="form.firstName" label="First name" />
            <Input v-model="form.lastName" label="Last name" />
          </div>
          <Input v-model="form.entityName" label="Entity name" />
          <Input v-model="form.email" label="Email" type="email" />
          <Input v-model="form.phone" label="Phone" />
          <Input v-model="form.address1" label="Street address 1" />
          <Input v-model="form.address2" label="Street address 2" />
          <div class="grid gap-3 sm:grid-cols-3">
            <Input v-model="form.city" label="City" />
            <Input v-model="form.state" label="State" />
            <Input v-model="form.postalCode" label="Zip" />
          </div>
          <Select v-model="form.status" label="Status">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="DeceasedOutstanding">DeceasedOutstanding</option>
            <option value="DeceasedSurrendered">DeceasedSurrendered</option>
          </Select>

          <Select v-if="canManagePortalAccess" v-model="form.portalUserId" label="Portal access user">
            <option value="">No portal user linked</option>
            <option v-for="u in portalUsers" :key="u.id" :value="u.id">{{ u.email }}</option>
          </Select>
        </div>

        <div class="flex justify-end gap-2 border-t border-slate-200 p-4">
          <Button variant="secondary" @click="cancelEdit">Cancel</Button>
          <Button type="submit" :loading="isSaving">{{ editingId ? 'Save changes' : 'Create shareholder' }}</Button>
        </div>
      </form>
    </Drawer>

    <ConfirmDialog
      :open="confirmDeleteOpen"
      title="Delete shareholder?"
      message="This action cannot be undone."
      @cancel="confirmDeleteOpen = false"
      @confirm="confirmDelete"
    />
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
import Drawer from '../components/ui/Drawer.vue';
import DropdownMenu from '../components/ui/DropdownMenu.vue';
import ConfirmDialog from '../components/ui/ConfirmDialog.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import LoadingState from '../components/ui/LoadingState.vue';

const rows = ref<any[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const search = ref('');
const portalUsers = ref<Array<{ id: string; email: string }>>([]);
const drawerOpen = ref(false);
const confirmDeleteOpen = ref(false);
const deleteId = ref<string | null>(null);
const deleteError = ref('');

const emptyForm = () => ({
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
  postalCode: '',
  status: 'Active',
  portalUserId: ''
});

const form = ref(emptyForm());
const editingId = ref<string | null>(null);
const auth = useAuthStore();
const canWrite = computed(() => auth.canWrite);
const canDelete = computed(() => auth.canPost);
const canManagePortalAccess = computed(() => auth.canPost);

const displayName = (s: any) => s.entityName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || '—';
const displayAddress = (s: any) => [s.address1, s.address2, s.city, s.state, s.postalCode].filter(Boolean).join(', ') || '—';
const linkedPortalEmail = (s: any) => s.shareholderLinks?.[0]?.user?.email || '—';

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return rows.value;
  return rows.value.filter((s) =>
    [displayName(s), s.email, s.phone, s.city, s.state, s.postalCode, s.status, s.type]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  );
});

const load = async () => {
  isLoading.value = true;
  try {
    rows.value = (await api.get('/shareholders')).data;
  } finally {
    isLoading.value = false;
  }
};

const loadPortalUsers = async () => {
  if (!canManagePortalAccess.value) return;
  portalUsers.value = (await api.get('/shareholders/portal-users')).data;
};

const openCreateDrawer = () => {
  editingId.value = null;
  form.value = emptyForm();
  drawerOpen.value = true;
};

const save = async () => {
  isSaving.value = true;
  try {
    let shareholderId = editingId.value;
    if (editingId.value) {
      await api.put(`/shareholders/${editingId.value}`, {
        ...form.value,
        portalUserId: undefined
      });
    } else {
      const created = (await api.post('/shareholders', { ...form.value, portalUserId: undefined, tags: [] })).data;
      shareholderId = created.id;
    }

    if (canManagePortalAccess.value && shareholderId) {
      await api.put(`/shareholders/${shareholderId}/portal-link`, {
        userId: form.value.portalUserId || null
      });
    }

    cancelEdit();
    await load();
  } finally {
    isSaving.value = false;
  }
};

const startEdit = (s: any) => {
  editingId.value = s.id;
  form.value = {
    type: s.type || 'PERSON',
    firstName: s.firstName || '',
    lastName: s.lastName || '',
    entityName: s.entityName || '',
    email: s.email || '',
    phone: s.phone || '',
    address1: s.address1 || '',
    address2: s.address2 || '',
    city: s.city || '',
    state: s.state || '',
    postalCode: s.postalCode || '',
    status: s.status || 'Active',
    portalUserId: s.shareholderLinks?.[0]?.userId || ''
  };
  drawerOpen.value = true;
};

const askDelete = (s: any) => {
  deleteError.value = '';
  deleteId.value = s.id;
  confirmDeleteOpen.value = true;
};

const confirmDelete = async () => {
  if (!deleteId.value) return;
  try {
    await api.delete(`/shareholders/${deleteId.value}`);
    confirmDeleteOpen.value = false;
    deleteId.value = null;
    deleteError.value = '';
    await load();
  } catch (error: any) {
    const message = error?.response?.data?.error || 'Unable to delete shareholder. Please check linked records and try again.';
    deleteError.value = message;
    confirmDeleteOpen.value = false;
  }
};

const cancelEdit = () => {
  editingId.value = null;
  form.value = emptyForm();
  drawerOpen.value = false;
};

onMounted(load);
onMounted(loadPortalUsers);
</script>
