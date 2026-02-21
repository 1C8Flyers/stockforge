<template>
  <section class="space-y-4">
    <h2 class="text-xl font-semibold text-slate-900">Admin / Settings</h2>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <div class="flex items-center justify-between"><h3 class="font-semibold text-slate-900">System Health</h3><Button variant="secondary" @click="loadHealth">Refresh</Button></div>
        <div v-if="health" class="mt-3 space-y-1 text-sm text-slate-700">
          <div>DB OK: <b>{{ health.dbOk ? 'Yes' : 'No' }}</b></div>
          <div>Migration count: <b>{{ health.migrationCount }}</b></div>
          <div>Server time: <b>{{ new Date(health.now).toLocaleString() }}</b></div>
        </div>
      </Card>

      <Card>
        <h3 class="font-semibold text-slate-900">Voting Configuration</h3>
        <label class="mt-3 flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" v-model="excludeDisputed" class="h-4 w-4 rounded border-slate-300" />
          Exclude disputed lots from voting
        </label>
        <Button class="mt-3" @click="saveConfig">Save config</Button>
      </Card>
    </div>

    <Card>
      <h3 class="font-semibold text-slate-900">Create User</h3>
      <form @submit.prevent="createUser" class="mt-3 grid gap-3 lg:grid-cols-6">
        <Input v-model="newUser.email" type="email" label="Email" />
        <Input v-model="newUser.password" type="password" label="Temporary password" />
        <label class="flex min-h-11 items-end gap-2 text-sm"><input type="checkbox" v-model="newUser.roles" value="Admin" /> Admin</label>
        <label class="flex min-h-11 items-end gap-2 text-sm"><input type="checkbox" v-model="newUser.roles" value="Officer" /> Officer</label>
        <label class="flex min-h-11 items-end gap-2 text-sm"><input type="checkbox" v-model="newUser.roles" value="Clerk" /> Clerk</label>
        <label class="flex min-h-11 items-end gap-2 text-sm"><input type="checkbox" v-model="newUser.roles" value="ReadOnly" /> ReadOnly</label>
        <div class="lg:col-span-6"><Button type="submit">Create</Button></div>
      </form>
    </Card>

    <Card class="p-0">
      <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 class="font-semibold text-slate-900">Users</h3>
        <Button variant="secondary" @click="loadUsers">Refresh users</Button>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50"><tr><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Email</th><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Roles</th><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Set Roles</th><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Reset Password</th></tr></thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            <tr v-for="u in users" :key="u.id">
              <td class="px-4 py-3 text-sm text-slate-700">{{ u.email }}</td>
              <td class="px-4 py-3 text-sm text-slate-700">{{ u.userRoles.map((r: any) => r.role.name).join(', ') }}</td>
              <td class="px-4 py-3 text-sm">
                <div class="flex flex-wrap gap-3">
                  <label><input type="checkbox" :checked="hasRole(u, 'Admin')" @change="toggleRole(u, 'Admin', ($event.target as HTMLInputElement).checked)" />Admin</label>
                  <label><input type="checkbox" :checked="hasRole(u, 'Officer')" @change="toggleRole(u, 'Officer', ($event.target as HTMLInputElement).checked)" />Officer</label>
                  <label><input type="checkbox" :checked="hasRole(u, 'Clerk')" @change="toggleRole(u, 'Clerk', ($event.target as HTMLInputElement).checked)" />Clerk</label>
                  <label><input type="checkbox" :checked="hasRole(u, 'ReadOnly')" @change="toggleRole(u, 'ReadOnly', ($event.target as HTMLInputElement).checked)" />ReadOnly</label>
                  <Button size="sm" variant="secondary" @click="saveRoles(u)">Save</Button>
                </div>
              </td>
              <td class="px-4 py-3 text-sm">
                <div class="flex min-w-[220px] items-center gap-2">
                  <Input v-model="passwords[u.id]" type="password" placeholder="New password" />
                  <Button size="sm" @click="resetPassword(u.id)">Reset</Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import Button from '../components/ui/Button.vue';
import Card from '../components/ui/Card.vue';
import Input from '../components/ui/Input.vue';

const auth = useAuthStore();
const router = useRouter();
if (!auth.isAdmin) {
  router.push('/');
}

const health = ref<any>(null);
const excludeDisputed = ref(false);
const users = ref<any[]>([]);
const passwords = ref<Record<string, string>>({});

const newUser = ref({ email: '', password: '', roles: ['ReadOnly'] as string[] });
const draftRoles = ref<Record<string, string[]>>({});

const loadHealth = async () => {
  health.value = (await api.get('/admin/health')).data;
};

const loadConfig = async () => {
  const cfg = (await api.get('/config')).data;
  excludeDisputed.value = cfg.excludeDisputedFromVoting === 'true';
};

const saveConfig = async () => {
  await api.put('/config', { excludeDisputedFromVoting: excludeDisputed.value });
};

const loadUsers = async () => {
  users.value = (await api.get('/admin/users')).data;
  draftRoles.value = {};
  for (const u of users.value) {
    draftRoles.value[u.id] = u.userRoles.map((r: any) => r.role.name);
  }
};

const createUser = async () => {
  await api.post('/admin/users', newUser.value);
  newUser.value = { email: '', password: '', roles: ['ReadOnly'] };
  await loadUsers();
};

const hasRole = (u: any, role: string) => (draftRoles.value[u.id] || []).includes(role);
const toggleRole = (u: any, role: string, on: boolean) => {
  const next = new Set(draftRoles.value[u.id] || []);
  if (on) next.add(role);
  else next.delete(role);
  draftRoles.value[u.id] = [...next];
};

const saveRoles = async (u: any) => {
  const roles = draftRoles.value[u.id] || [];
  if (!roles.length) return;
  await api.put(`/admin/users/${u.id}/roles`, { roles });
  await loadUsers();
};

const resetPassword = async (userId: string) => {
  const password = passwords.value[userId];
  if (!password || password.length < 8) return;
  await api.put(`/admin/users/${userId}/password`, { password });
  passwords.value[userId] = '';
};

onMounted(async () => {
  await Promise.all([loadHealth(), loadConfig(), loadUsers()]);
});
</script>
