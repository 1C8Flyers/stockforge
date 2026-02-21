<template>
  <section class="space-y-4">
    <h2 class="text-xl font-semibold text-slate-900">Meetings & Proxies</h2>
    <p v-if="!canWrite" class="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">Read-only mode: meeting/proxy create actions are disabled.</p>

    <Card v-if="canWrite">
      <form @submit.prevent="createMeeting" class="grid gap-3 sm:grid-cols-3">
        <Input v-model="meetingForm.title" label="Meeting title" />
        <Input v-model="meetingForm.dateTime" type="datetime-local" label="Date and time" />
        <div class="flex items-end"><Button type="submit">Create meeting</Button></div>
      </form>
    </Card>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card class="p-0">
        <div class="border-b border-slate-200 px-4 py-3"><h3 class="font-semibold text-slate-900">Meetings</h3></div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50"><tr><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Title</th><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Represented</th></tr></thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              <tr v-for="m in meetings" :key="m.id" class="cursor-pointer hover:bg-slate-50" @click="selectMeeting(m.id)">
                <td class="px-4 py-3 text-sm text-slate-900">{{ m.title }}</td>
                <td class="px-4 py-3 text-sm text-slate-600">{{ new Date(m.dateTime).toLocaleString() }}</td>
                <td class="px-4 py-3 text-sm text-slate-600">{{ mode[m.id]?.representedShares || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 class="font-semibold text-slate-900">Proxies (selected meeting)</h3>
        <form v-if="canWrite" @submit.prevent="createProxy" class="mt-3 grid gap-3">
          <Select v-model="proxyForm.grantorId" label="Grantor">
            <option value="">Grantor</option><option v-for="s in shareholders" :value="s.id" :key="s.id">{{ displayName(s) }}</option>
          </Select>
          <Input v-model="proxyForm.proxyHolderName" label="Proxy holder name" />
          <Button type="submit" :disabled="!selectedMeetingId">Create proxy</Button>
        </form>
        <p v-else class="mt-2 text-sm text-slate-600">Read-only mode: cannot create proxies.</p>
        <ul class="mt-3 space-y-2">
          <li v-for="p in proxies" :key="p.id" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>{{ p.proxyHolderName }} · {{ p.status }} · {{ p.proxySharesSnapshot }} shares</span>
              <div v-if="canWrite" class="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  :disabled="p.status === 'Verified'"
                  @click="setProxyStatus(p.id, 'Verified')"
                >
                  Verify
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  :disabled="p.status === 'Revoked'"
                  @click="setProxyStatus(p.id, 'Revoked')"
                >
                  Revoke
                </Button>
              </div>
            </div>
          </li>
        </ul>
      </Card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';
import Button from '../components/ui/Button.vue';
import Card from '../components/ui/Card.vue';
import Input from '../components/ui/Input.vue';
import Select from '../components/ui/Select.vue';

const meetings = ref<any[]>([]);
const shareholders = ref<any[]>([]);
const proxies = ref<any[]>([]);
const mode = ref<Record<string, any>>({});
const selectedMeetingId = ref('');
const meetingForm = ref({ title: '', dateTime: '' });
const proxyForm = ref({ grantorId: '', proxyHolderName: '' });
const auth = useAuthStore();
const canWrite = computed(() => auth.canWrite);

const displayName = (s: any) => s.entityName || `${s.firstName || ''} ${s.lastName || ''}`;

const load = async () => {
  meetings.value = (await api.get('/meetings')).data;
  shareholders.value = (await api.get('/shareholders')).data;
  for (const m of meetings.value) {
    mode.value[m.id] = (await api.get(`/meetings/${m.id}/mode`)).data;
  }
};

const selectMeeting = async (id: string) => {
  selectedMeetingId.value = id;
  proxies.value = (await api.get('/proxies', { params: { meetingId: id } })).data;
};

const createMeeting = async () => {
  const dt = new Date(meetingForm.value.dateTime).toISOString();
  await api.post('/meetings', { title: meetingForm.value.title, dateTime: dt });
  meetingForm.value = { title: '', dateTime: '' };
  await load();
};

const createProxy = async () => {
  await api.post('/proxies', {
    meetingId: selectedMeetingId.value,
    grantorId: proxyForm.value.grantorId,
    proxyHolderName: proxyForm.value.proxyHolderName,
    receivedDate: new Date().toISOString(),
    status: 'Draft'
  });
  proxyForm.value = { grantorId: '', proxyHolderName: '' };
  await selectMeeting(selectedMeetingId.value);
};

const setProxyStatus = async (id: string, status: 'Verified' | 'Revoked') => {
  await api.put(`/proxies/${id}`, { status });
  await selectMeeting(selectedMeetingId.value);
  await load();
};

onMounted(load);
</script>
