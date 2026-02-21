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
              <tr v-for="m in meetings" :key="m.id" class="cursor-pointer hover:bg-slate-50" :class="selectedMeetingId === m.id ? 'bg-brand-50' : ''" @click="selectMeeting(m.id)">
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
        <p v-if="selectedMeetingId" class="mt-2 text-xs text-slate-500">
          Present shares: {{ selectedMode?.presentShares || 0 }} · Proxy shares: {{ selectedMode?.proxyShares || 0 }} · Represented: {{ selectedMode?.representedShares || 0 }}
        </p>
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

    <div v-if="selectedMeetingId" class="grid gap-4 lg:grid-cols-2">
      <Card>
        <h3 class="font-semibold text-slate-900">Attendance</h3>
        <p class="mt-1 text-xs text-slate-500">Toggle who is present for the selected meeting.</p>
        <ul class="mt-3 space-y-2">
          <li v-for="s in shareholders" :key="s.id" class="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <span class="text-slate-800">{{ displayName(s) }}</span>
            <label class="inline-flex items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300"
                :checked="isPresent(s.id)"
                :disabled="!canWrite"
                @change="setAttendance(s.id, ($event.target as HTMLInputElement).checked)"
              />
              Present
            </label>
          </li>
        </ul>
      </Card>

      <Card class="space-y-3">
        <h3 class="font-semibold text-slate-900">Motions & Votes</h3>
        <form v-if="canWrite" @submit.prevent="createMotion" class="grid gap-3">
          <Input v-model="motionForm.title" label="Motion title" />
          <label class="grid gap-1 text-sm text-slate-700">
            <span>Motion text</span>
            <textarea
              v-model="motionForm.text"
              class="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              placeholder="Enter motion details"
            />
          </label>
          <div>
            <Button type="submit">Add motion</Button>
          </div>
        </form>

        <ul class="space-y-3">
          <li v-for="m in selectedMotions" :key="m.id" class="rounded-lg border border-slate-200 p-3">
            <p class="text-sm font-semibold text-slate-900">{{ m.title }}</p>
            <p class="mt-1 text-sm text-slate-600">{{ m.text }}</p>
            <p v-if="latestVote(m)" class="mt-2 text-xs text-slate-500">
              Latest vote: Yes {{ latestVote(m)?.yesShares }} · No {{ latestVote(m)?.noShares }} · Abstain {{ latestVote(m)?.abstainShares }} · Result {{ latestVote(m)?.result }}
            </p>
            <form v-if="canPost" class="mt-3 grid gap-2 sm:grid-cols-4" @submit.prevent="recordVote(m.id)">
              <Input v-model="voteForm(m.id).yesShares" type="number" min="0" label="Yes" />
              <Input v-model="voteForm(m.id).noShares" type="number" min="0" label="No" />
              <Input v-model="voteForm(m.id).abstainShares" type="number" min="0" label="Abstain" />
              <div class="flex items-end">
                <Button type="submit" variant="secondary">Record vote</Button>
              </div>
            </form>
          </li>
          <li v-if="selectedMotions.length === 0" class="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
            No motions yet.
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
const motionForm = ref({ title: '', text: '' });
const voteForms = ref<Record<string, { yesShares: string; noShares: string; abstainShares: string }>>({});
const auth = useAuthStore();
const canWrite = computed(() => auth.canWrite);
const canPost = computed(() => auth.canPost);
const selectedMode = computed(() => (selectedMeetingId.value ? mode.value[selectedMeetingId.value] : null));
const selectedMotions = computed(() => selectedMode.value?.meeting?.motions || []);
const presentShareholderIds = computed(() => {
  const rows = selectedMode.value?.meeting?.attendance || [];
  return new Set(rows.filter((a: any) => a.present).map((a: any) => a.shareholderId));
});

const displayName = (s: any) => s.entityName || `${s.firstName || ''} ${s.lastName || ''}`;

const load = async () => {
  meetings.value = (await api.get('/meetings')).data;
  shareholders.value = (await api.get('/shareholders')).data;
  for (const m of meetings.value) {
    mode.value[m.id] = (await api.get(`/meetings/${m.id}/mode`)).data;
  }
};

const refreshSelectedMode = async () => {
  if (!selectedMeetingId.value) return;
  mode.value[selectedMeetingId.value] = (await api.get(`/meetings/${selectedMeetingId.value}/mode`)).data;
};

const selectMeeting = async (id: string) => {
  selectedMeetingId.value = id;
  proxies.value = (await api.get('/proxies', { params: { meetingId: id } })).data;
  if (!mode.value[id]) {
    mode.value[id] = (await api.get(`/meetings/${id}/mode`)).data;
  }
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
  await refreshSelectedMode();
};

const setProxyStatus = async (id: string, status: 'Verified' | 'Revoked') => {
  await api.put(`/proxies/${id}`, { status });
  await selectMeeting(selectedMeetingId.value);
  await refreshSelectedMode();
};

const isPresent = (shareholderId: string) => presentShareholderIds.value.has(shareholderId);

const setAttendance = async (shareholderId: string, present: boolean) => {
  if (!selectedMeetingId.value || !canWrite.value) return;
  await api.post(`/meetings/${selectedMeetingId.value}/attendance`, { shareholderId, present });
  await refreshSelectedMode();
};

const createMotion = async () => {
  if (!selectedMeetingId.value) return;
  await api.post(`/meetings/${selectedMeetingId.value}/motions`, motionForm.value);
  motionForm.value = { title: '', text: '' };
  await refreshSelectedMode();
};

const voteForm = (motionId: string) => {
  if (!voteForms.value[motionId]) {
    voteForms.value[motionId] = { yesShares: '0', noShares: '0', abstainShares: '0' };
  }
  return voteForms.value[motionId];
};

const recordVote = async (motionId: string) => {
  const form = voteForm(motionId);
  await api.post(`/meetings/motions/${motionId}/votes`, {
    yesShares: Number(form.yesShares || 0),
    noShares: Number(form.noShares || 0),
    abstainShares: Number(form.abstainShares || 0)
  });
  await refreshSelectedMode();
};

const latestVote = (motion: any) => {
  if (!motion?.votes?.length) return null;
  return motion.votes[motion.votes.length - 1];
};

onMounted(load);
</script>
