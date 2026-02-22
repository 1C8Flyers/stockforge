<template>
  <Card class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900">Email</h3>
        <p class="text-sm text-slate-600">Control feature toggles, SMTP settings, and outbound mail diagnostics.</p>
      </div>
      <Button :loading="store.saving.email" @click="store.saveEmail">Save</Button>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="space-y-2 rounded-lg border border-slate-200 p-3">
        <h4 class="text-sm font-semibold text-slate-900">Email Preferences</h4>
        <label class="flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" v-model="store.config.emailPasswordResetsEnabled" class="h-4 w-4 rounded border-slate-300" />
          Password reset emails enabled
        </label>
        <label class="flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" v-model="store.config.emailMeetingReportsEnabled" class="h-4 w-4 rounded border-slate-300" />
          Meeting report emails enabled
        </label>
        <label class="flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" v-model="store.config.emailProxyReceiptEnabled" class="h-4 w-4 rounded border-slate-300" />
          Proxy receipt emails enabled
        </label>
        <label class="flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" v-model="store.config.emailCertificateNoticesEnabled" class="h-4 w-4 rounded border-slate-300" />
          Certificate notice emails enabled
        </label>
      </div>

      <div class="space-y-2 rounded-lg border border-slate-200 p-3">
        <h4 class="text-sm font-semibold text-slate-900">SMTP</h4>
        <label class="flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" v-model="store.email.enabled" class="h-4 w-4 rounded border-slate-300" />
          Enable outbound email
        </label>
        <div class="grid gap-3 sm:grid-cols-2">
          <Input v-model="store.email.smtpHost" label="SMTP host" placeholder="smtp.example.com" />
          <Input v-model="store.email.smtpPort" label="SMTP port" placeholder="587" type="number" min="1" max="65535" />
          <label class="flex min-h-11 items-end gap-2 text-sm text-slate-700">
            <input type="checkbox" v-model="store.email.smtpSecure" class="h-4 w-4 rounded border-slate-300" />
            Secure (TLS/SSL)
          </label>
          <Input v-model="store.email.smtpUser" label="SMTP user (optional)" placeholder="mailer@example.com" />
          <Input
            v-model="store.email.smtpPassword"
            type="password"
            label="SMTP password"
            :help="store.email.hasSmtpPassword ? 'Password is set. Leave blank to keep current.' : 'Password required when enabling email.'"
          />
          <Input v-model="store.email.fromName" label="From name" placeholder="StockForge" />
          <Input v-model="store.email.fromEmail" label="From email" placeholder="noreply@example.com" />
          <Input v-model="store.email.replyTo" label="Reply-to (optional)" placeholder="support@example.com" />
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 p-3">
      <Input v-model="store.email.testToEmail" label="Send test to" placeholder="you@example.com" />
      <Button variant="secondary" :loading="store.loading.email" @click="store.sendTestEmail">Send test email</Button>
      <Button variant="ghost" @click="store.loadEmailLogs">Refresh logs</Button>
    </div>

    <p v-if="store.errors.email" class="text-sm text-rose-700">{{ store.errors.email }}</p>
    <p v-else-if="store.messages.email" class="text-sm text-emerald-700">{{ store.messages.email }}</p>

    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">When</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Type</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">To</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Subject</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Error</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 bg-white">
          <tr v-for="log in store.emailLogs" :key="log.id">
            <td class="px-4 py-3 text-sm text-slate-700">{{ new Date(log.createdAt).toLocaleString() }}</td>
            <td class="px-4 py-3 text-sm text-slate-700">{{ log.type }}</td>
            <td class="px-4 py-3 text-sm text-slate-700">{{ log.to }}</td>
            <td class="px-4 py-3 text-sm text-slate-700">{{ log.subject }}</td>
            <td class="px-4 py-3 text-sm" :class="log.status === 'SENT' ? 'text-emerald-700' : 'text-rose-700'">{{ log.status }}</td>
            <td class="px-4 py-3 text-sm text-slate-700">{{ log.errorSafe || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="store.lastSavedAt.email" class="text-xs text-slate-500">Last saved at {{ store.lastSavedAt.email }}</p>
  </Card>
</template>

<script setup lang="ts">
import { useAdminStore } from '../../stores/adminStore';
import Button from '../ui/Button.vue';
import Card from '../ui/Card.vue';
import Input from '../ui/Input.vue';

const store = useAdminStore();
</script>
