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
          <Select v-model="motionForm.type" label="Vote type">
            <option value="STANDARD">Standard motion</option>
            <option value="ELECTION">Election</option>
          </Select>
          <Input v-if="motionForm.type === 'STANDARD'" v-model="motionForm.title" label="Motion title" />
          <Input v-if="motionForm.type === 'ELECTION'" v-model="motionForm.officeTitle" label="Office" placeholder="Example: Board Seat A" />
          <label v-if="motionForm.type === 'ELECTION'" class="grid gap-1 text-sm text-slate-700">
            <span>Candidates (one per line)</span>
            <textarea
              v-model="motionForm.candidatesText"
              class="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              placeholder="Jane Doe&#10;John Smith"
            />
          </label>
          <label v-if="motionForm.type === 'STANDARD'" class="grid gap-1 text-sm text-slate-700">
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
            <p class="mt-1 text-xs text-slate-500">
              Type: {{ motionType(m) }}
              <span v-if="motionType(m) === 'ELECTION'"> · Office: {{ m.officeTitle || '—' }}</span>
            </p>
            <p class="mt-1 text-sm text-slate-600">{{ m.text }}</p>
            <p v-if="latestVote(m)" class="mt-2 text-xs text-slate-500">
              Latest vote: Yes {{ latestVote(m)?.yesShares }} · No {{ latestVote(m)?.noShares }} · Abstain {{ latestVote(m)?.abstainShares }} · Result {{ latestVote(m)?.result }}
            </p>
            <div v-if="motionType(m) === 'ELECTION' && electionTotals(m).length" class="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
              <p class="font-medium">Latest election totals</p>
              <ul class="mt-1 space-y-1">
                <li v-for="row in electionTotals(m)" :key="row.candidate">{{ row.candidate }}: {{ row.shares }} shares</li>
              </ul>
            </div>
            <form v-if="canPost" class="mt-3 grid gap-2" @submit.prevent="recordVote(m.id)">
              <div v-if="presentVoters.length === 0" class="rounded border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
                No present shareholders to vote.
              </div>
              <div
                v-for="v in presentVoters"
                :key="`${m.id}-${v.shareholderId}`"
                class="grid gap-2 rounded border border-slate-200 p-2 sm:grid-cols-[1fr_180px] sm:items-end"
              >
                <div class="text-sm text-slate-800">{{ v.name }} <span class="text-slate-500">({{ v.shares }} shares)</span></div>
                <Select v-model="voteForm(m.id)[v.shareholderId]" label="Vote">
                  <option value="">No vote</option>
                  <option v-if="motionType(m) !== 'ELECTION'" value="yes">Yes</option>
                  <option v-if="motionType(m) !== 'ELECTION'" value="no">No</option>
                  <option v-if="motionType(m) !== 'ELECTION'" value="abstain">Abstain</option>
                  <option v-for="c in motionCandidates(m)" :key="c" :value="`candidate:${c}`">{{ c }}</option>
                </Select>
              </div>
              <div class="flex items-end">
                <Button type="submit" variant="secondary" :disabled="presentVoters.length === 0">Record shareholder votes</Button>
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
const presentVoters = ref<Array<{ shareholderId: string; name: string; shares: number }>>([]);
const mode = ref<Record<string, any>>({});
const selectedMeetingId = ref('');
const meetingForm = ref({ title: '', dateTime: '' });
const proxyForm = ref({ grantorId: '', proxyHolderName: '' });
const motionForm = ref({ type: 'STANDARD' as 'STANDARD' | 'ELECTION', title: '', text: '', officeTitle: '', candidatesText: '' });
const voteForms = ref<Record<string, Record<string, string>>>({});
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

const loadPresentVoters = async () => {
  if (!selectedMeetingId.value) {
    presentVoters.value = [];
    return;
  }
  presentVoters.value = (await api.get(`/meetings/${selectedMeetingId.value}/present-voters`)).data;
};

const selectMeeting = async (id: string) => {
  selectedMeetingId.value = id;
  proxies.value = (await api.get('/proxies', { params: { meetingId: id } })).data;
  await loadPresentVoters();
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
  await loadPresentVoters();
  await refreshSelectedMode();
};

const createMotion = async () => {
  if (!selectedMeetingId.value) return;
  const candidates = motionForm.value.candidatesText
    .split('\n')
    .map((c) => c.trim())
    .filter(Boolean);

  await api.post(`/meetings/${selectedMeetingId.value}/motions`, {
    type: motionForm.value.type,
    title: motionForm.value.type === 'STANDARD' ? motionForm.value.title : undefined,
    text: motionForm.value.type === 'STANDARD' ? motionForm.value.text : undefined,
    officeTitle: motionForm.value.type === 'ELECTION' ? motionForm.value.officeTitle : undefined,
    candidates: motionForm.value.type === 'ELECTION' ? candidates : undefined
  });
  motionForm.value = { type: 'STANDARD', title: '', text: '', officeTitle: '', candidatesText: '' };
  await refreshSelectedMode();
};

const voteForm = (motionId: string) => {
  if (!voteForms.value[motionId]) {
    voteForms.value[motionId] = {};
  }
  return voteForms.value[motionId];
};

const recordVote = async (motionId: string) => {
  const form = voteForm(motionId);
  const motion = selectedMotions.value.find((m: any) => m.id === motionId);
  if (!motion) return;

  if (motionType(motion) === 'ELECTION') {
    const ballots = presentVoters.value
      .map((v) => ({ shareholderId: v.shareholderId, vote: form[v.shareholderId] || '' }))
      .filter((b) => b.vote.startsWith('candidate:'))
      .map((b) => ({ shareholderId: b.shareholderId, candidate: b.vote.replace(/^candidate:/, '') }))
      .filter((b) => b.candidate);

    if (ballots.length === 0) return;
    await api.post(`/meetings/motions/${motionId}/votes`, { ballots });
  } else {
    const ballots = presentVoters.value
      .map((v) => ({ shareholderId: v.shareholderId, choice: form[v.shareholderId] }))
      .filter((b): b is { shareholderId: string; choice: 'yes' | 'no' | 'abstain' } => b.choice === 'yes' || b.choice === 'no' || b.choice === 'abstain');

    if (ballots.length === 0) return;
    await api.post(`/meetings/motions/${motionId}/votes`, { ballots });
  }

  await refreshSelectedMode();
};

const latestVote = (motion: any) => {
  if (!motion?.votes?.length) return null;
  return motion.votes[motion.votes.length - 1];
};

const motionType = (motion: any) => motion?.type || 'STANDARD';

const motionCandidates = (motion: any): string[] => {
  const raw = motion?.candidatesJson;
  return Array.isArray(raw) ? raw.map((c) => String(c)) : [];
};

const electionTotals = (motion: any): Array<{ candidate: string; shares: number }> => {
  const details = latestVote(motion)?.detailsJson;
  if (!details || typeof details !== 'object') return [];
  const totals = (details as any).totals;
  if (!Array.isArray(totals)) return [];
  return totals.map((t: any) => ({ candidate: String(t.candidate || ''), shares: Number(t.shares || 0) }));
};

onMounted(load);
</script>
