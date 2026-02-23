<template>
  <section class="min-h-screen bg-slate-100 p-6 sm:p-10">
    <div class="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">System Admin</h1>
        <p class="mt-1 text-sm text-slate-600">Manage tenants and tenant role memberships across the system.</p>
      </div>

      <Card class="space-y-4 p-5">
        <div class="flex flex-wrap gap-2">
          <Button variant="secondary" :loading="loading" @click="loadAll">Refresh</Button>
          <Button variant="ghost" @click="goHome">Back to App</Button>
          <Button variant="danger" @click="logout">Logout</Button>
        </div>
        <p v-if="error" class="text-sm text-rose-700">{{ error }}</p>
      </Card>

      <Card class="space-y-4 p-5">
        <h2 class="text-lg font-semibold text-slate-900">Create Tenant</h2>
        <form class="grid gap-3 sm:grid-cols-3" @submit.prevent="createTenant">
          <Input v-model="newTenant.slug" label="Slug" placeholder="north-branch" />
          <Input v-model="newTenant.name" label="Name" placeholder="North Branch" />
          <div class="flex items-end">
            <Button type="submit" :loading="creatingTenant">Create Tenant</Button>
          </div>
        </form>
      </Card>

      <Card class="space-y-4 p-5">
        <h2 class="text-lg font-semibold text-slate-900">Tenants</h2>
        <div class="overflow-x-auto rounded-lg border border-slate-200">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Slug</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Members</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Shareholders</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              <tr v-for="tenant in tenants" :key="tenant.id">
                <td class="px-4 py-3 text-sm text-slate-700">{{ tenant.slug }}</td>
                <td class="px-4 py-3 text-sm text-slate-700">{{ tenant.name }}</td>
                <td class="px-4 py-3 text-sm text-slate-700">{{ tenant._count.tenantUsers }}</td>
                <td class="px-4 py-3 text-sm text-slate-700">{{ tenant._count.shareholders }}</td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" @click="selectTenant(tenant.id)">Manage Members</Button>
                    <Button variant="ghost" size="sm" @click="openTenantAdmin(tenant.slug)">Open /admin</Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card v-if="selectedTenant" class="space-y-4 p-5">
        <h2 class="text-lg font-semibold text-slate-900">Tenant Members: {{ selectedTenant.slug }}</h2>
        <form class="grid gap-3 md:grid-cols-6" @submit.prevent="saveMembership">
          <label class="block space-y-1.5 md:col-span-2">
            <span class="text-sm font-medium text-slate-700">User</span>
            <select
              v-model="membershipDraft.userId"
              class="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-600 focus:ring-brand-600"
            >
              <option value="">Select user</option>
              <option v-for="user in users" :key="user.id" :value="user.id">{{ user.email }}</option>
            </select>
          </label>

          <div class="md:col-span-3">
            <span class="text-sm font-medium text-slate-700">Roles</span>
            <div class="mt-2 flex flex-wrap gap-3 text-sm text-slate-700">
              <label><input v-model="membershipDraft.roles" type="checkbox" value="Admin" /> Admin</label>
              <label><input v-model="membershipDraft.roles" type="checkbox" value="Officer" /> Officer</label>
              <label><input v-model="membershipDraft.roles" type="checkbox" value="Clerk" /> Clerk</label>
              <label><input v-model="membershipDraft.roles" type="checkbox" value="ReadOnly" /> ReadOnly</label>
            </div>
          </div>

          <div class="flex items-end">
            <Button type="submit" :loading="savingMembership">Save Membership</Button>
          </div>
        </form>

        <div class="overflow-x-auto rounded-lg border border-slate-200">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">User</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Roles</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              <tr v-for="member in members" :key="member.id">
                <td class="px-4 py-3 text-sm text-slate-700">{{ member.user.email }}</td>
                <td class="px-4 py-3 text-sm text-slate-700">{{ member.roles.join(', ') }}</td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" @click="editMembership(member)">Edit</Button>
                    <Button variant="danger" size="sm" @click="removeMembership(member.userId)">Remove</Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';
import Button from '../components/ui/Button.vue';
import Card from '../components/ui/Card.vue';
import Input from '../components/ui/Input.vue';

type RoleName = 'Admin' | 'Officer' | 'Clerk' | 'ReadOnly';

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  _count: {
    tenantUsers: number;
    shareholders: number;
    meetings: number;
  };
};

type UserRow = {
  id: string;
  email: string;
};

type MemberRow = {
  id: string;
  userId: string;
  roles: RoleName[];
  user: {
    id: string;
    email: string;
  };
};

const router = useRouter();
const auth = useAuthStore();

const tenants = ref<TenantRow[]>([]);
const users = ref<UserRow[]>([]);
const members = ref<MemberRow[]>([]);
const selectedTenantId = ref('');

const loading = ref(false);
const creatingTenant = ref(false);
const savingMembership = ref(false);
const error = ref('');

const newTenant = ref({ slug: '', name: '' });
const membershipDraft = ref<{ userId: string; roles: RoleName[] }>({
  userId: '',
  roles: ['ReadOnly']
});

const selectedTenant = computed(() => tenants.value.find((tenant) => tenant.id === selectedTenantId.value) || null);

const loadAll = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [tenantRes, userRes] = await Promise.all([api.get('/system-admin/tenants'), api.get('/system-admin/users')]);
    tenants.value = tenantRes.data;
    users.value = userRes.data;
    if (!selectedTenantId.value && tenants.value.length) {
      selectedTenantId.value = tenants.value[0].id;
    }
    if (selectedTenantId.value) {
      await loadMembers(selectedTenantId.value);
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Unable to load system admin data.';
  } finally {
    loading.value = false;
  }
};

const loadMembers = async (tenantId: string) => {
  const res = await api.get(`/system-admin/tenants/${tenantId}/members`);
  members.value = res.data;
};

const selectTenant = async (tenantId: string) => {
  selectedTenantId.value = tenantId;
  membershipDraft.value = { userId: '', roles: ['ReadOnly'] };
  await loadMembers(tenantId);
};

const createTenant = async () => {
  const slug = newTenant.value.slug.trim().toLowerCase();
  const name = newTenant.value.name.trim();
  if (!slug || !name) return;

  creatingTenant.value = true;
  error.value = '';
  try {
    await api.post('/system-admin/tenants', { slug, name });
    newTenant.value = { slug: '', name: '' };
    await loadAll();
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Unable to create tenant.';
  } finally {
    creatingTenant.value = false;
  }
};

const saveMembership = async () => {
  if (!selectedTenantId.value) return;
  if (!membershipDraft.value.userId) return;
  if (!membershipDraft.value.roles.length) return;

  savingMembership.value = true;
  error.value = '';
  try {
    await api.put(`/system-admin/tenants/${selectedTenantId.value}/members/${membershipDraft.value.userId}`, {
      roles: membershipDraft.value.roles
    });
    await loadMembers(selectedTenantId.value);
    membershipDraft.value = { userId: '', roles: ['ReadOnly'] };
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Unable to save membership.';
  } finally {
    savingMembership.value = false;
  }
};

const editMembership = (member: MemberRow) => {
  membershipDraft.value = {
    userId: member.userId,
    roles: [...member.roles]
  };
};

const removeMembership = async (userId: string) => {
  if (!selectedTenantId.value) return;
  error.value = '';
  try {
    await api.delete(`/system-admin/tenants/${selectedTenantId.value}/members/${userId}`);
    await loadMembers(selectedTenantId.value);
    if (membershipDraft.value.userId === userId) {
      membershipDraft.value = { userId: '', roles: ['ReadOnly'] };
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Unable to remove membership.';
  }
};

const openTenantAdmin = (slug: string) => {
  if (!slug) return;
  const base = (import.meta.env.VITE_TENANT_BASE_DOMAIN || '').trim().toLowerCase();
  if (base && typeof window !== 'undefined') {
    window.location.href = `${window.location.protocol}//${slug}.${base}/admin`;
    return;
  }
  router.push('/admin');
};

const goHome = () => {
  router.push('/');
};

const logout = () => {
  auth.clear();
  router.push('/login');
};

onMounted(async () => {
  await loadAll();
});
</script>
