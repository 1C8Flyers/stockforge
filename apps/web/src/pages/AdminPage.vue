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
        <Button class="mt-3" :loading="isSavingConfig" @click="saveConfig">Save config</Button>
      </Card>
    </div>

    <Card>
      <h3 class="font-semibold text-slate-900">Branding</h3>
      <div class="mt-3 grid gap-3 sm:grid-cols-4">
        <Input v-model="appDisplayName" label="App name" placeholder="StockForge" />
        <Input v-model="appLogoUrl" label="Logo URL" placeholder="https://..." />
        <Input v-model="appIncorporationState" label="State of incorporation" placeholder="Wyoming" />
        <Input v-model="appPublicBaseUrl" label="Public app URL" placeholder="https://enterprise.local:15173" />
      </div>
      <div class="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <img v-if="appLogoUrl" :src="appLogoUrl" alt="Logo preview" class="h-10 w-10 rounded object-cover" />
        <div class="text-sm text-slate-700">
          <div>Preview: <b>{{ appDisplayName || 'StockForge' }}</b></div>
          <div v-if="appIncorporationState" class="text-xs text-slate-500">State of incorporation: {{ appIncorporationState }}</div>
        </div>
      </div>
      <Button class="mt-3" :loading="isSavingBranding" @click="saveBranding">Save branding</Button>
      <p v-if="brandingMessage" class="mt-2 text-sm" :class="brandingMessageTone === 'error' ? 'text-rose-700' : 'text-emerald-700'">{{ brandingMessage }}</p>
    </Card>

    <Card>
      <h3 class="font-semibold text-slate-900">Email Settings</h3>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label class="flex min-h-11 items-center gap-2 text-sm text-slate-700 sm:col-span-2 lg:col-span-1">
          <input type="checkbox" v-model="emailEnabled" class="h-4 w-4 rounded border-slate-300" />
          Enable outbound email
        </label>
        <Input v-model="smtpHost" label="SMTP host" placeholder="smtp.example.com" />
        <Input v-model="smtpPort" label="SMTP port" placeholder="587" type="number" min="1" max="65535" />
        <label class="flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" v-model="smtpSecure" class="h-4 w-4 rounded border-slate-300" />
          Secure (TLS/SSL)
        </label>
        <Input v-model="smtpUser" label="SMTP user (optional)" placeholder="mailer@example.com" />
        <Input
          v-model="smtpPassword"
          type="password"
          label="SMTP password"
          :help="hasSmtpPassword ? 'Password is set. Leave blank to keep current.' : 'Password required when enabling email.'"
        />
        <Input v-model="fromName" label="From name" placeholder="StockForge" />
        <Input v-model="fromEmail" label="From email" placeholder="noreply@example.com" />
        <Input v-model="replyTo" label="Reply-to (optional)" placeholder="support@example.com" />
      </div>

      <div class="mt-4 flex flex-wrap items-end gap-2">
        <Button :loading="isSavingEmailSettings" @click="saveEmailSettings">Save email settings</Button>
        <Input v-model="testToEmail" label="Send test to" placeholder="you@example.com" />
        <Button variant="secondary" :loading="isSendingTestEmail" @click="sendTestEmail">Send test email</Button>
      </div>
      <p v-if="emailSettingsMessage" class="mt-2 text-sm" :class="emailSettingsMessageTone === 'error' ? 'text-rose-700' : 'text-emerald-700'">
        {{ emailSettingsMessage }}
      </p>
    </Card>

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
import type { EmailSettingsDto, EmailSettingsTestDto, EmailSettingsUpdateDto } from '@cottonwood/shared';
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
const appDisplayName = ref('StockForge');
const appLogoUrl = ref('');
const appIncorporationState = ref('');
const appPublicBaseUrl = ref('');
const users = ref<any[]>([]);
const passwords = ref<Record<string, string>>({});
const isSavingConfig = ref(false);
const isSavingBranding = ref(false);
const brandingMessage = ref('');
const brandingMessageTone = ref<'success' | 'error'>('success');
const emailEnabled = ref(false);
const smtpHost = ref('');
const smtpPort = ref('');
const smtpSecure = ref(false);
const smtpUser = ref('');
const smtpPassword = ref('');
const hasSmtpPassword = ref(false);
const fromName = ref('');
const fromEmail = ref('');
const replyTo = ref('');
const testToEmail = ref('');
const isSavingEmailSettings = ref(false);
const isSendingTestEmail = ref(false);
const emailSettingsMessage = ref('');
const emailSettingsMessageTone = ref<'success' | 'error'>('success');

const newUser = ref({ email: '', password: '', roles: ['ReadOnly'] as string[] });
const draftRoles = ref<Record<string, string[]>>({});

const loadHealth = async () => {
  health.value = (await api.get('/admin/health')).data;
};

const loadConfig = async () => {
  const cfg = (await api.get('/config')).data;
  excludeDisputed.value = cfg.excludeDisputedFromVoting === 'true';
  appDisplayName.value = cfg.appDisplayName || 'StockForge';
  appLogoUrl.value = cfg.appLogoUrl || '';
  appIncorporationState.value = cfg.appIncorporationState || '';
  appPublicBaseUrl.value = cfg.appPublicBaseUrl || '';
};

const saveConfig = async () => {
  isSavingConfig.value = true;
  try {
    const data = (await api.put('/config', {
      excludeDisputedFromVoting: excludeDisputed.value,
      appDisplayName: appDisplayName.value.trim() || 'StockForge',
      appLogoUrl: appLogoUrl.value.trim(),
      appIncorporationState: appIncorporationState.value.trim(),
      appPublicBaseUrl: appPublicBaseUrl.value.trim()
    })).data;
    excludeDisputed.value = data.excludeDisputedFromVoting === 'true';
  } finally {
    isSavingConfig.value = false;
  }
};

const saveBranding = async () => {
  brandingMessage.value = '';
  isSavingBranding.value = true;
  try {
    const data = (await api.put('/config', {
      appDisplayName: appDisplayName.value.trim() || 'StockForge',
      appLogoUrl: appLogoUrl.value.trim(),
      appIncorporationState: appIncorporationState.value.trim(),
      appPublicBaseUrl: appPublicBaseUrl.value.trim()
    })).data as Record<string, string>;

    appDisplayName.value = data.appDisplayName || 'StockForge';
    appLogoUrl.value = data.appLogoUrl || '';
    appIncorporationState.value = data.appIncorporationState || '';
    appPublicBaseUrl.value = data.appPublicBaseUrl || '';

    window.dispatchEvent(
      new CustomEvent('app-branding-updated', {
        detail: {
          appDisplayName: appDisplayName.value,
          appLogoUrl: appLogoUrl.value
        }
      })
    );

    brandingMessageTone.value = 'success';
    brandingMessage.value = 'Branding saved.';
  } catch (error: any) {
    brandingMessageTone.value = 'error';
    brandingMessage.value = error?.response?.data?.message || 'Unable to save branding.';
  } finally {
    isSavingBranding.value = false;
  }
};

const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

const loadEmailSettings = async () => {
  const data = (await api.get('/admin/email-settings')).data as EmailSettingsDto;
  emailEnabled.value = data.enabled;
  smtpHost.value = data.smtpHost || '';
  smtpPort.value = data.smtpPort ? String(data.smtpPort) : '';
  smtpSecure.value = data.smtpSecure;
  smtpUser.value = data.smtpUser || '';
  hasSmtpPassword.value = data.hasPassword;
  smtpPassword.value = '';
  fromName.value = data.fromName || '';
  fromEmail.value = data.fromEmail || '';
  replyTo.value = data.replyTo || '';
};

const saveEmailSettings = async () => {
  emailSettingsMessage.value = '';

  const portText = smtpPort.value.trim();
  const parsedPort = portText ? Number(portText) : null;
  if (portText && (!Number.isInteger(parsedPort) || Number(parsedPort) < 1 || Number(parsedPort) > 65535)) {
    emailSettingsMessageTone.value = 'error';
    emailSettingsMessage.value = 'SMTP port must be an integer between 1 and 65535.';
    return;
  }

  if (fromEmail.value.trim() && !isValidEmail(fromEmail.value.trim())) {
    emailSettingsMessageTone.value = 'error';
    emailSettingsMessage.value = 'From email is invalid.';
    return;
  }

  if (replyTo.value.trim() && !isValidEmail(replyTo.value.trim())) {
    emailSettingsMessageTone.value = 'error';
    emailSettingsMessage.value = 'Reply-to email is invalid.';
    return;
  }

  if (emailEnabled.value) {
    if (!smtpHost.value.trim() || !smtpPort.value.trim() || !fromName.value.trim() || !fromEmail.value.trim()) {
      emailSettingsMessageTone.value = 'error';
      emailSettingsMessage.value = 'SMTP host, port, from name, and from email are required when email is enabled.';
      return;
    }
    if (!hasSmtpPassword.value && !smtpPassword.value.trim()) {
      emailSettingsMessageTone.value = 'error';
      emailSettingsMessage.value = 'SMTP password is required when enabling email.';
      return;
    }
  }

  const payload: EmailSettingsUpdateDto = {
    enabled: emailEnabled.value,
    smtpHost: smtpHost.value.trim() || null,
    smtpPort: parsedPort,
    smtpSecure: smtpSecure.value,
    smtpUser: smtpUser.value.trim() || null,
    smtpPassword: smtpPassword.value.trim() || null,
    fromName: fromName.value.trim() || null,
    fromEmail: fromEmail.value.trim() || null,
    replyTo: replyTo.value.trim() || null
  };

  isSavingEmailSettings.value = true;
  try {
    const data = (await api.put('/admin/email-settings', payload)).data as EmailSettingsDto;
    hasSmtpPassword.value = data.hasPassword;
    smtpPassword.value = '';
    emailSettingsMessageTone.value = 'success';
    emailSettingsMessage.value = 'Email settings saved.';
  } catch (error: any) {
    emailSettingsMessageTone.value = 'error';
    emailSettingsMessage.value = error?.response?.data?.message || 'Unable to save email settings.';
  } finally {
    isSavingEmailSettings.value = false;
  }
};

const sendTestEmail = async () => {
  emailSettingsMessage.value = '';
  if (!testToEmail.value.trim() || !isValidEmail(testToEmail.value.trim())) {
    emailSettingsMessageTone.value = 'error';
    emailSettingsMessage.value = 'Enter a valid test email address.';
    return;
  }

  isSendingTestEmail.value = true;
  try {
    const payload: EmailSettingsTestDto = { toEmail: testToEmail.value.trim() };
    const result = (await api.post('/admin/email-settings/test', payload)).data as { ok: boolean; error?: string };
    if (result.ok) {
      emailSettingsMessageTone.value = 'success';
      emailSettingsMessage.value = 'Test email sent.';
    } else {
      emailSettingsMessageTone.value = 'error';
      emailSettingsMessage.value = result.error || 'Unable to send test email.';
    }
  } catch (error: any) {
    emailSettingsMessageTone.value = 'error';
    emailSettingsMessage.value = error?.response?.data?.message || 'Unable to send test email.';
  } finally {
    isSendingTestEmail.value = false;
  }
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
  await Promise.all([loadHealth(), loadConfig(), loadUsers(), loadEmailSettings()]);
});
</script>
