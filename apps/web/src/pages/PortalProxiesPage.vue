<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold text-slate-900">Proxy Authorizations</h1>

    <Card class="space-y-3">
      <h2 class="text-sm font-semibold text-slate-700">Create Proxy</h2>
      <div class="grid gap-3 md:grid-cols-2">
        <Select v-model="form.proxyType" label="Type">
          <option v-for="option in proxyTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </Select>
        <Input v-model="form.meetingId" label="Meeting ID (required for temporary)" placeholder="meeting id" />
        <Input v-model="form.proxyHolderName" label="Proxy holder name" placeholder="Jane Doe" />
        <Input v-model="form.proxyHolderEmail" label="Proxy holder email" placeholder="jane@example.com" />
      </div>
      <label class="flex items-center gap-2 text-sm text-slate-700">
        <input v-model="form.signConfirmed" type="checkbox" />
        I confirm this proxy authorization intent.
      </label>
      <p v-if="formError" class="text-sm text-rose-700">{{ formError }}</p>
      <Button :loading="saving" @click="createProxy">Create proxy</Button>
    </Card>

    <Card>
      <h2 class="mb-2 text-sm font-semibold text-slate-700">My Proxies</h2>
      <p v-if="loading" class="text-sm text-slate-600">Loading...</p>
      <p v-else-if="error" class="text-sm text-rose-700">{{ error }}</p>
      <div v-else class="space-y-2">
        <div v-for="proxy in proxies" :key="proxy.id" class="rounded border border-slate-200 p-3 text-sm">
          <div class="font-medium text-slate-900">{{ proxy.proxyType }} · {{ proxy.status }}</div>
          <div class="text-slate-600">Holder: {{ proxy.proxyHolderName || proxy.proxyHolderEmail || 'Linked shareholder' }}</div>
          <div class="text-slate-600">Created: {{ new Date(proxy.createdAt).toLocaleString() }}</div>
          <Button
            v-if="proxy.status !== 'REVOKED'"
            class="mt-2"
            variant="secondary"
            size="sm"
            @click="revokeProxy(proxy.id)"
          >
            Revoke
          </Button>
        </div>
        <p v-if="!proxies.length" class="text-sm text-slate-500">No proxies created yet.</p>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api';
import Card from '../components/ui/Card.vue';
import Input from '../components/ui/Input.vue';
import Select from '../components/ui/Select.vue';
import Button from '../components/ui/Button.vue';

const route = useRoute();
const tenantSlug = computed(() => String(route.params.tenantSlug || 'default'));

const loading = ref(false);
const saving = ref(false);
const error = ref('');
const formError = ref('');
const proxies = ref<any[]>([]);

const form = reactive({
  proxyType: 'MEETING',
  meetingId: '',
  proxyHolderName: '',
  proxyHolderEmail: '',
  signConfirmed: true
});

const proxyTypeOptions = [
  { value: 'MEETING', label: 'Temporary (Meeting)' },
  { value: 'STANDING', label: 'Standing' }
];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    proxies.value = (await api.get(`/portal/t/${tenantSlug.value}/proxies`)).data;
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Unable to load proxies.';
  } finally {
    loading.value = false;
  }
}

async function createProxy() {
  saving.value = true;
  formError.value = '';
  try {
    await api.post(`/portal/t/${tenantSlug.value}/proxies`, {
      proxyType: form.proxyType,
      meetingId: form.proxyType === 'MEETING' ? form.meetingId || null : null,
      proxyHolderName: form.proxyHolderName || null,
      proxyHolderEmail: form.proxyHolderEmail || null,
      signConfirmed: form.signConfirmed
    });
    form.meetingId = '';
    form.proxyHolderName = '';
    form.proxyHolderEmail = '';
    await load();
  } catch (err: any) {
    formError.value = err?.response?.data?.message || 'Unable to create proxy.';
  } finally {
    saving.value = false;
  }
}

async function revokeProxy(id: string) {
  await api.post(`/portal/t/${tenantSlug.value}/proxies/${id}/revoke`);
  await load();
}

onMounted(load);
</script>
