<template>
  <Card class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900">System</h3>
        <p class="text-sm text-slate-600">Health and migration diagnostics for this deployment.</p>
      </div>
      <Button variant="secondary" :loading="store.loading.system" @click="store.loadSystem">Refresh</Button>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <div>DB OK: <b>{{ store.system.dbOk ? 'Yes' : 'No' }}</b></div>
        <div>Migration count: <b>{{ store.system.migrationCount }}</b></div>
        <div>Server time: <b>{{ store.system.now ? new Date(store.system.now).toLocaleString() : '—' }}</b></div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <div v-if="store.systemStatus === 'warning'" class="text-amber-700">Migration warning: no migrations recorded yet.</div>
        <div v-else-if="store.systemStatus === 'error'" class="text-rose-700">System issue: health check failed.</div>
        <div v-else class="text-emerald-700">System looks healthy.</div>
      </div>
    </div>

    <p v-if="store.errors.system" class="text-sm text-rose-700">{{ store.errors.system }}</p>
    <p v-else-if="store.messages.system" class="text-sm text-emerald-700">{{ store.messages.system }}</p>
  </Card>
</template>

<script setup lang="ts">
import { useAdminStore } from '../../stores/adminStore';
import Button from '../ui/Button.vue';
import Card from '../ui/Card.vue';

const store = useAdminStore();
</script>
