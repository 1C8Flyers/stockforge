<template>
  <Card class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900">Users & Roles</h3>
        <p class="text-sm text-slate-600">Manage users, tenant role assignments, password resets, and portal shareholder links.</p>
      </div>
      <Button variant="secondary" :loading="store.loading.users" @click="store.loadUsers">Refresh</Button>
    </div>

    <form @submit.prevent="submitCreate" class="grid gap-3 lg:grid-cols-6">
      <Input v-model="newUser.email" type="email" label="Email" />
      <Input v-model="newUser.password" type="password" label="Temporary password" />
      <label class="flex min-h-11 items-end gap-2 text-sm"><input type="checkbox" v-model="newUser.roles" value="Admin" /> Admin</label>
      <label class="flex min-h-11 items-end gap-2 text-sm"><input type="checkbox" v-model="newUser.roles" value="Officer" /> Officer</label>
      <label class="flex min-h-11 items-end gap-2 text-sm"><input type="checkbox" v-model="newUser.roles" value="Clerk" /> Clerk</label>
      <label class="flex min-h-11 items-end gap-2 text-sm"><input type="checkbox" v-model="newUser.roles" value="ReadOnly" /> ReadOnly</label>
      <div class="lg:col-span-6">
        <Button type="submit" :loading="store.saving.users">Create user</Button>
      </div>
    </form>

    <p v-if="store.errors.users" class="text-sm text-rose-700">{{ store.errors.users }}</p>
    <p v-else-if="store.messages.users" class="text-sm text-emerald-700">{{ store.messages.users }}</p>

    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Email</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Tenant Roles</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Set Tenant Roles</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Portal Shareholder</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Reset Password</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 bg-white">
          <tr v-for="u in store.users" :key="u.id">
            <td class="px-4 py-3 text-sm text-slate-700">{{ u.email }}</td>
            <td class="px-4 py-3 text-sm text-slate-700">{{ getTenantRoles(u).join(', ') || 'No tenant role' }}</td>
            <td class="px-4 py-3 text-sm">
              <div class="flex flex-wrap gap-3">
                <label><input type="checkbox" :checked="hasRole(u.id, 'Admin')" @change="toggleRole(u.id, 'Admin', ($event.target as HTMLInputElement).checked)" />Admin</label>
                <label><input type="checkbox" :checked="hasRole(u.id, 'Officer')" @change="toggleRole(u.id, 'Officer', ($event.target as HTMLInputElement).checked)" />Officer</label>
                <label><input type="checkbox" :checked="hasRole(u.id, 'Clerk')" @change="toggleRole(u.id, 'Clerk', ($event.target as HTMLInputElement).checked)" />Clerk</label>
                <label><input type="checkbox" :checked="hasRole(u.id, 'ReadOnly')" @change="toggleRole(u.id, 'ReadOnly', ($event.target as HTMLInputElement).checked)" />ReadOnly</label>
                <Button size="sm" variant="secondary" :loading="store.saving.users" @click="saveRoles(u.id)">Save</Button>
              </div>
            </td>
            <td class="px-4 py-3 text-sm">
              <div class="flex min-w-[280px] items-center gap-2">
                <select
                  v-model="draftShareholderLinks[u.id]"
                  class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">No link</option>
                  <option v-for="s in store.shareholders" :key="s.id" :value="s.id">
                    {{ shareholderLabel(s) }}
                  </option>
                </select>
                <Button
                  size="sm"
                  variant="secondary"
                  :loading="store.saving.users"
                  @click="saveShareholderLink(u.id)"
                >
                  Save
                </Button>
              </div>
            </td>
            <td class="px-4 py-3 text-sm">
              <div class="flex min-w-[220px] items-center gap-2">
                <Input v-model="passwords[u.id]" type="password" placeholder="New password" />
                <Button size="sm" :loading="store.saving.users" @click="resetPassword(u.id)">Reset</Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="store.lastSavedAt.users" class="text-xs text-slate-500">Last saved at {{ store.lastSavedAt.users }}</p>
  </Card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAdminStore } from '../../stores/adminStore';
import Button from '../ui/Button.vue';
import Card from '../ui/Card.vue';
import Input from '../ui/Input.vue';

const store = useAdminStore();

const newUser = ref({ email: '', password: '', roles: ['ReadOnly'] as string[] });
const draftRoles = ref<Record<string, string[]>>({});
const draftShareholderLinks = ref<Record<string, string>>({});
const passwords = ref<Record<string, string>>({});

const getTenantRoles = (user: any): string[] => {
  const roles = user?.tenantUsers?.[0]?.roles;
  return Array.isArray(roles) ? roles : [];
};

watch(
  () => store.users,
  (users) => {
    const next: Record<string, string[]> = {};
    const nextLinks: Record<string, string> = {};
    for (const user of users) next[user.id] = getTenantRoles(user);
    for (const user of users) {
      const current = user.shareholderLinks?.[0]?.shareholderId;
      nextLinks[user.id] = current || '';
    }
    draftRoles.value = next;
    draftShareholderLinks.value = nextLinks;
  },
  { immediate: true, deep: true }
);

const hasRole = (userId: string, role: string) => (draftRoles.value[userId] || []).includes(role);

const toggleRole = (userId: string, role: string, on: boolean) => {
  const next = new Set(draftRoles.value[userId] || []);
  if (on) next.add(role);
  else next.delete(role);
  draftRoles.value[userId] = [...next];
};

const submitCreate = async () => {
  await store.createUser({
    email: newUser.value.email.trim(),
    password: newUser.value.password,
    roles: newUser.value.roles
  });
  if (!store.errors.users) {
    newUser.value = { email: '', password: '', roles: ['ReadOnly'] };
  }
};

const saveRoles = async (userId: string) => {
  const roles = draftRoles.value[userId] || [];
  if (!roles.length) return;
  await store.updateUserRole(userId, roles);
};

const shareholderLabel = (shareholder: any) => {
  if (shareholder.entityName) return shareholder.entityName;
  const name = `${shareholder.firstName || ''} ${shareholder.lastName || ''}`.trim();
  if (name) return name;
  return shareholder.id;
};

const saveShareholderLink = async (userId: string) => {
  const shareholderId = draftShareholderLinks.value[userId] || null;
  await store.setUserShareholderLink(userId, shareholderId);
};

const resetPassword = async (userId: string) => {
  const password = passwords.value[userId] || '';
  if (password.length < 8) return;
  await store.resetUserPassword(userId, password);
  if (!store.errors.users) {
    passwords.value[userId] = '';
  }
};
</script>
