<template>
  <Card class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900">Voting / Governance</h3>
        <p class="text-sm text-slate-600">Configure governance rules that affect eligibility and tallying.</p>
      </div>
      <Button :loading="store.saving.voting" @click="store.saveVoting">Save</Button>
    </div>

    <label class="flex min-h-11 items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" v-model="store.config.excludeDisputedFromVoting" class="h-4 w-4 rounded border-slate-300" />
      Exclude disputed lots from voting
    </label>

    <p v-if="store.errors.voting" class="text-sm text-rose-700">{{ store.errors.voting }}</p>
    <p v-else-if="store.messages.voting" class="text-sm text-emerald-700">{{ store.messages.voting }}</p>
    <p v-if="store.lastSavedAt.voting" class="text-xs text-slate-500">Last saved at {{ store.lastSavedAt.voting }}</p>
  </Card>
</template>

<script setup lang="ts">
import { useAdminStore } from '../../stores/adminStore';
import Button from '../ui/Button.vue';
import Card from '../ui/Card.vue';

const store = useAdminStore();
</script>
