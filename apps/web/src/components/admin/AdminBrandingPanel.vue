<template>
  <Card class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900">Branding</h3>
        <p class="text-sm text-slate-600">Set app name, logo, incorporation state, and public URL.</p>
      </div>
      <Button :loading="store.saving.branding" @click="store.saveBranding">Save</Button>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <Input v-model="store.config.appDisplayName" label="App name" placeholder="StockForge" />
      <Input v-model="store.config.appLogoUrl" label="Logo URL" placeholder="https://..." />
      <Input v-model="store.config.appIncorporationState" label="State of incorporation" placeholder="Wyoming" />
      <Input v-model="store.config.appPublicBaseUrl" label="Public app URL" placeholder="https://enterprise.local:15173" />
      <Input v-model="store.config.certificateSecretaryName" label="Certificate Secretary name" placeholder="Jane Doe" />
      <Input v-model="store.config.certificatePresidentName" label="Certificate President name" placeholder="John Doe" />
    </div>

    <div class="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <img v-if="store.config.appLogoUrl" :src="store.config.appLogoUrl" alt="Logo preview" class="h-10 w-10 rounded object-cover" />
      <div class="text-sm text-slate-700">
        <div>Preview: <b>{{ store.config.appDisplayName || 'StockForge' }}</b></div>
        <div v-if="store.config.appIncorporationState" class="text-xs text-slate-500">State of incorporation: {{ store.config.appIncorporationState }}</div>
      </div>
    </div>

    <p v-if="store.errors.branding" class="text-sm text-rose-700">{{ store.errors.branding }}</p>
    <p v-else-if="store.messages.branding" class="text-sm text-emerald-700">{{ store.messages.branding }}</p>
    <p v-if="store.lastSavedAt.branding" class="text-xs text-slate-500">Last saved at {{ store.lastSavedAt.branding }}</p>
  </Card>
</template>

<script setup lang="ts">
import { useAdminStore } from '../../stores/adminStore';
import Button from '../ui/Button.vue';
import Card from '../ui/Card.vue';
import Input from '../ui/Input.vue';

const store = useAdminStore();
</script>
