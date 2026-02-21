<template>
  <section>
    <h2>Admin / Settings</h2>

    <div style="margin-bottom:16px;padding:10px;border:1px solid #ddd;">
      <h3>System Health</h3>
      <button @click="loadHealth">Refresh health</button>
      <div v-if="health" style="margin-top:8px;">
        <div>DB OK: <b>{{ health.dbOk ? 'Yes' : 'No' }}</b></div>
        <div>Migration count: <b>{{ health.migrationCount }}</b></div>
        <div>Server time: <b>{{ new Date(health.now).toLocaleString() }}</b></div>
      </div>
    </div>

    <div style="margin-bottom:16px;padding:10px;border:1px solid #ddd;">
      <h3>Voting Configuration</h3>
      <label style="display:flex;gap:8px;align-items:center;">
        <input type="checkbox" v-model="excludeDisputed" />
        Exclude disputed lots from voting
      </label>
      <button @click="saveConfig" style="margin-top:8px;">Save config</button>
    </div>

    <div style="margin-bottom:16px;padding:10px;border:1px solid #ddd;">
      <h3>Create User</h3>
      <form @submit.prevent="createUser" style="display:flex;gap:8px;flex-wrap:wrap;">
        <input v-model="newUser.email" placeholder="Email" type="email" required />
        <input v-model="newUser.password" placeholder="Temp password" type="password" required />
        <label><input type="checkbox" v-model="newUser.roles" value="Admin" /> Admin</label>
        <label><input type="checkbox" v-model="newUser.roles" value="Officer" /> Officer</label>
        <label><input type="checkbox" v-model="newUser.roles" value="Clerk" /> Clerk</label>
        <label><input type="checkbox" v-model="newUser.roles" value="ReadOnly" /> ReadOnly</label>
        <button>Create</button>
      </form>
    </div>

    <div style="padding:10px;border:1px solid #ddd;">
      <h3>Users</h3>
      <button @click="loadUsers">Refresh users</button>
      <table border="1" cellpadding="6" width="100%" style="margin-top:8px;">
        <thead><tr><th>Email</th><th>Roles</th><th>Set Roles</th><th>Reset Password</th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.email }}</td>
            <td>{{ u.userRoles.map((r: any) => r.role.name).join(', ') }}</td>
            <td>
              <label><input type="checkbox" :checked="hasRole(u, 'Admin')" @change="toggleRole(u, 'Admin', ($event.target as HTMLInputElement).checked)" />Admin</label>
              <label><input type="checkbox" :checked="hasRole(u, 'Officer')" @change="toggleRole(u, 'Officer', ($event.target as HTMLInputElement).checked)" />Officer</label>
              <label><input type="checkbox" :checked="hasRole(u, 'Clerk')" @change="toggleRole(u, 'Clerk', ($event.target as HTMLInputElement).checked)" />Clerk</label>
              <label><input type="checkbox" :checked="hasRole(u, 'ReadOnly')" @change="toggleRole(u, 'ReadOnly', ($event.target as HTMLInputElement).checked)" />ReadOnly</label>
              <button @click="saveRoles(u)">Save</button>
            </td>
            <td>
              <input v-model="passwords[u.id]" type="password" placeholder="New password" />
              <button @click="resetPassword(u.id)">Reset</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

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
