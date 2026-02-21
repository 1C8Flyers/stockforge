<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">Meetings & Proxies</h2>
        <p class="text-sm text-slate-600">Select a meeting to manage attendance, proxies, and motions.</p>
      </div>
      <Button v-if="canWrite" type="button" @click="meetingFormOpen = true">Create meeting</Button>
    </div>
    <p v-if="!canWrite" class="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">Read-only mode: meeting/proxy create actions are disabled.</p>

    <div class="grid gap-4 lg:grid-cols-[360px,1fr]">
      <Card class="p-0">
        <div class="space-y-3 border-b border-slate-200 px-4 py-3">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-slate-900">Meetings</h3>
            <span class="text-xs text-slate-500">{{ filteredMeetings.length }} shown</span>
          </div>
          <Input v-model="meetingSearch" label="Search meetings" placeholder="Title or date" />
        </div>
        <div class="max-h-[70vh] overflow-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50"><tr><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Title</th><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th><th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Represented</th></tr></thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              <tr v-for="m in filteredMeetings" :key="m.id" class="cursor-pointer hover:bg-slate-50" :class="selectedMeetingId === m.id ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : ''" @click="selectMeeting(m.id)">
                <td class="px-4 py-3 text-sm font-medium text-slate-900">{{ m.title }}</td>
                <td class="px-4 py-3 text-sm text-slate-600">{{ new Date(m.dateTime).toLocaleString() }}</td>
                <td class="px-4 py-3 text-sm text-slate-600">{{ mode[m.id]?.representedShares || 0 }}</td>
              </tr>
              <tr v-if="filteredMeetings.length === 0">
                <td colspan="3" class="px-4 py-6 text-sm text-slate-500">No meetings match your search.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card v-if="selectedMeetingId" class="space-y-4">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 class="text-lg font-semibold text-slate-900">{{ selectedMode?.meeting?.title }}</h3>
            <p class="text-xs text-slate-500">{{ new Date(selectedMode?.meeting?.dateTime || '').toLocaleString() }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button v-if="canWrite" type="button" size="sm" variant="secondary" @click="proxyFormOpen = true">Add proxy</Button>
            <Button v-if="canWrite" type="button" size="sm" variant="secondary" @click="motionFormOpen = true">Add motion</Button>
          </div>
        </div>

        <div class="grid gap-2 sm:grid-cols-3">
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p class="text-xs uppercase tracking-wide text-slate-500">Present shares</p>
            <p class="font-semibold text-slate-900">{{ selectedMode?.presentShares || 0 }}</p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p class="text-xs uppercase tracking-wide text-slate-500">Proxy shares</p>
            <p class="font-semibold text-slate-900">{{ selectedMode?.proxyShares || 0 }}</p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p class="text-xs uppercase tracking-wide text-slate-500">Represented</p>
            <p class="font-semibold text-slate-900">{{ selectedMode?.representedShares || 0 }}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button type="button" class="rounded-lg px-3 py-1.5 text-sm" :class="activeTab === 'overview' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'" @click="activeTab = 'overview'">Overview</button>
          <button type="button" class="rounded-lg px-3 py-1.5 text-sm" :class="activeTab === 'attendance' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'" @click="activeTab = 'attendance'">Attendance ({{ presentCount }}/{{ shareholders.length }})</button>
          <button type="button" class="rounded-lg px-3 py-1.5 text-sm" :class="activeTab === 'proxies' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'" @click="activeTab = 'proxies'">Proxies ({{ proxies.length }})</button>
          <button type="button" class="rounded-lg px-3 py-1.5 text-sm" :class="activeTab === 'motions' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'" @click="activeTab = 'motions'">Motions & Votes ({{ selectedMotions.length }})</button>
        </div>

        <div v-if="activeTab === 'overview'" class="space-y-3">
          <p class="text-sm text-slate-600">Use tabs above to update attendance, process proxies, and run motions with voting.</p>
          <div class="grid gap-2 sm:grid-cols-2">
            <div class="rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
              <p class="font-medium text-slate-900">Attendance progress</p>
              <p class="mt-1">{{ presentCount }} of {{ shareholders.length }} shareholders marked present.</p>
            </div>
            <div class="rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
              <p class="font-medium text-slate-900">Motion status</p>
              <p class="mt-1">{{ closedMotionsCount }} closed · {{ openMotionsCount }} open.</p>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'attendance'" class="space-y-3">
          <p class="text-xs text-slate-500">Toggle who is present for the selected meeting.</p>
          <ul class="max-h-[52vh] space-y-2 overflow-auto pr-1">
            <li v-for="s in shareholders" :key="s.id" class="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span class="text-slate-800">
                {{ displayName(s) }}
                <span v-if="proxyForGrantor(s.id)" class="ml-2 text-xs text-amber-700">(proxied to {{ proxyForGrantor(s.id)?.proxyHolderName }})</span>
              </span>
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
        </div>

        <div v-if="activeTab === 'proxies'" class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-slate-900">Proxies</h4>
            <Button v-if="canWrite" type="button" size="sm" variant="secondary" @click="proxyFormOpen = true">Add proxy</Button>
          </div>
          <p v-if="!canWrite" class="text-sm text-slate-600">Read-only mode: cannot create proxies.</p>
          <ul class="max-h-[52vh] space-y-2 overflow-auto pr-1">
            <li v-for="p in proxies" :key="p.id" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {{ p.proxyHolderName }}
                  <span class="mx-1">·</span>
                  <span :class="p.status === 'Verified' ? 'text-emerald-700' : p.status === 'Revoked' ? 'text-rose-700' : 'text-amber-700'">{{ p.status }}</span>
                  <span class="mx-1">·</span>
                  {{ p.proxySharesSnapshot }} shares
                </span>
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
            <li v-if="proxies.length === 0" class="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">No proxies yet.</li>
          </ul>
        </div>

        <div v-if="activeTab === 'motions'" class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-slate-900">Motions & Votes</h4>
            <Button v-if="canWrite" type="button" size="sm" variant="secondary" @click="motionFormOpen = true">Add motion</Button>
          </div>
          <ul class="max-h-[62vh] space-y-3 overflow-auto pr-1">
            <li v-for="m in selectedMotions" :key="m.id" class="rounded-lg border border-slate-200 p-3">
              <p class="text-sm font-semibold text-slate-900">{{ m.title }}</p>
              <p class="mt-1 text-xs text-slate-500">
                Type: {{ motionType(m) }}
                <span v-if="motionType(m) === 'ELECTION'"> · Office: {{ m.officeTitle || '—' }}</span>
                <span> · Status: {{ m.isClosed ? 'Closed' : 'Open' }}</span>
              </p>
              <p class="mt-1 text-sm text-slate-600">{{ m.text }}</p>
              <p v-if="latestVote(m) && motionType(m) !== 'ELECTION'" class="mt-2 text-xs text-slate-500">
                Latest vote: Yes {{ latestVote(m)?.yesShares }} · No {{ latestVote(m)?.noShares }} · Abstain {{ latestVote(m)?.abstainShares }} · Result {{ latestVote(m)?.result }}
              </p>
              <p v-if="latestVote(m) && motionType(m) === 'ELECTION'" class="mt-2 text-xs text-slate-500">
                Latest election winners: {{ electionWinnersText(m) }}
              </p>
              <div v-if="motionType(m) === 'ELECTION' && electionTotals(m).length" class="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                <p class="font-medium">Latest election totals</p>
                <ul class="mt-1 space-y-1">
                  <li v-for="row in electionTotals(m)" :key="row.candidate">{{ row.candidate }}: {{ row.shares }} shares</li>
                </ul>
              </div>
              <form v-if="canPost && !isVotePanelCollapsed(m)" class="mt-3 grid gap-2" @submit.prevent="recordVote(m.id)">
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
                  <Button type="submit" variant="secondary" :disabled="presentVoters.length === 0" :loading="recordingMotionId === m.id">
                    Record shareholder votes
                  </Button>
                </div>
                <p v-if="recordedMotionId === m.id" class="text-xs text-emerald-700">Votes recorded successfully.</p>
              </form>
              <div v-else-if="canPost" class="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                <p class="font-medium">Votes recorded.</p>
                <p class="mt-1">{{ collapsedSummaryText(m) }}</p>
                <div class="mt-2">
                  <Button size="sm" variant="secondary" :loading="reopeningMotionId === m.id" @click="openVotePanel(m.id)">Reopen voting</Button>
                </div>
              </div>
            </li>
            <li v-if="selectedMotions.length === 0" class="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
              No motions yet.
            </li>
          </ul>
        </div>
      </Card>

      <Card v-else>
        <p class="text-sm text-slate-600">Select a meeting to view attendance, proxies, motions, and voting details.</p>
      </Card>
    </div>

    <Teleport to="body">
      <div v-if="meetingFormOpen" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-slate-900/50" @click="closeMeetingForm" />
        <div class="relative z-10 mx-auto mt-10 w-[min(900px,95vw)]">
          <Card class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-slate-900">Create meeting</h3>
              <Button type="button" variant="ghost" @click="closeMeetingForm">Close</Button>
            </div>
            <form @submit.prevent="createMeeting" class="grid gap-3 sm:grid-cols-3">
              <Input v-model="meetingForm.title" label="Meeting title" />
              <Input v-model="meetingForm.dateTime" type="datetime-local" label="Date and time" />
              <div class="flex items-end"><Button type="submit">Create meeting</Button></div>
            </form>
          </Card>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="proxyFormOpen && selectedMeetingId" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-slate-900/50" @click="closeProxyForm" />
        <div class="relative z-10 mx-auto mt-10 w-[min(900px,95vw)]">
          <Card class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-slate-900">Create proxy</h3>
              <Button type="button" variant="ghost" @click="closeProxyForm">Close</Button>
            </div>
            <form @submit.prevent="createProxy" class="grid gap-3">
              <Select v-model="proxyForm.grantorId" label="Grantor">
                <option value="">Grantor</option><option v-for="s in shareholders" :value="s.id" :key="s.id">{{ displayName(s) }}</option>
              </Select>
              <Select v-model="proxyForm.proxyHolderShareholderId" label="Proxy holder shareholder (optional)">
                <option value="">External/non-shareholder</option>
                <option v-for="s in shareholders" :value="s.id" :key="`holder-${s.id}`">{{ displayName(s) }}</option>
              </Select>
              <Input v-if="!proxyForm.proxyHolderShareholderId" v-model="proxyForm.proxyHolderName" label="Proxy holder name" />
              <div>
                <Button type="submit" :disabled="!selectedMeetingId">Create proxy</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="motionFormOpen && selectedMeetingId" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-slate-900/50" @click="closeMotionForm" />
        <div class="relative z-10 mx-auto mt-10 w-[min(900px,95vw)]">
          <Card class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-slate-900">Add motion</h3>
              <Button type="button" variant="ghost" @click="closeMotionForm">Close</Button>
            </div>
            <form @submit.prevent="createMotion" class="grid gap-3">
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
          </Card>
        </div>
      </div>
    </Teleport>
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
const meetingSearch = ref('');
const shareholders = ref<any[]>([]);
const proxies = ref<any[]>([]);
const presentVoters = ref<Array<{ shareholderId: string; name: string; shares: number }>>([]);
const mode = ref<Record<string, any>>({});
const selectedMeetingId = ref('');
const meetingForm = ref({ title: '', dateTime: '' });
const proxyForm = ref({ grantorId: '', proxyHolderName: '', proxyHolderShareholderId: '' });
const motionForm = ref({ type: 'STANDARD' as 'STANDARD' | 'ELECTION', title: '', text: '', officeTitle: '', candidatesText: '' });
const voteForms = ref<Record<string, Record<string, string>>>({});
const recordingMotionId = ref('');
const recordedMotionId = ref('');
const collapsedVotePanels = ref<Record<string, boolean>>({});
const reopeningMotionId = ref('');
const activeTab = ref<'overview' | 'attendance' | 'proxies' | 'motions'>('overview');
const meetingFormOpen = ref(false);
const proxyFormOpen = ref(false);
const motionFormOpen = ref(false);
const auth = useAuthStore();
const canWrite = computed(() => auth.canWrite);
const canPost = computed(() => auth.canPost);
const selectedMode = computed(() => (selectedMeetingId.value ? mode.value[selectedMeetingId.value] : null));
const selectedMotions = computed(() => selectedMode.value?.meeting?.motions || []);
const filteredMeetings = computed(() => {
  const q = meetingSearch.value.trim().toLowerCase();
  if (!q) return meetings.value;
  return meetings.value.filter((m) => {
    const dt = new Date(m.dateTime).toLocaleString();
    return `${m.title} ${dt}`.toLowerCase().includes(q);
  });
});
const presentCount = computed(() => {
  const rows = selectedMode.value?.meeting?.attendance || [];
  return rows.filter((a: any) => a.present).length;
});
const closedMotionsCount = computed(() => selectedMotions.value.filter((m: any) => m.isClosed).length);
const openMotionsCount = computed(() => selectedMotions.value.length - closedMotionsCount.value);
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
  activeTab.value = 'overview';
  collapsedVotePanels.value = {};
  proxies.value = (await api.get('/proxies', { params: { meetingId: id } })).data;
  await loadPresentVoters();
  mode.value[id] = (await api.get(`/meetings/${id}/mode`)).data;
};

const createMeeting = async () => {
  const dt = new Date(meetingForm.value.dateTime).toISOString();
  await api.post('/meetings', { title: meetingForm.value.title, dateTime: dt });
  meetingForm.value = { title: '', dateTime: '' };
  meetingFormOpen.value = false;
  await load();
};

const createProxy = async () => {
  const selectedHolder = shareholders.value.find((s: any) => s.id === proxyForm.value.proxyHolderShareholderId);
  const proxyHolderName = proxyForm.value.proxyHolderShareholderId
    ? (selectedHolder ? displayName(selectedHolder) : '')
    : proxyForm.value.proxyHolderName;

  await api.post('/proxies', {
    meetingId: selectedMeetingId.value,
    grantorId: proxyForm.value.grantorId,
    proxyHolderName,
    proxyHolderShareholderId: proxyForm.value.proxyHolderShareholderId || null,
    receivedDate: new Date().toISOString(),
    status: 'Draft'
  });
  proxyForm.value = { grantorId: '', proxyHolderName: '', proxyHolderShareholderId: '' };
  proxyFormOpen.value = false;
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
  motionFormOpen.value = false;
  await refreshSelectedMode();
};

const closeMeetingForm = () => {
  meetingFormOpen.value = false;
  meetingForm.value = { title: '', dateTime: '' };
};

const closeProxyForm = () => {
  proxyFormOpen.value = false;
  proxyForm.value = { grantorId: '', proxyHolderName: '', proxyHolderShareholderId: '' };
};

const closeMotionForm = () => {
  motionFormOpen.value = false;
  motionForm.value = { type: 'STANDARD', title: '', text: '', officeTitle: '', candidatesText: '' };
};

const voteForm = (motionId: string) => {
  if (!voteForms.value[motionId]) {
    voteForms.value[motionId] = {};
  }
  return voteForms.value[motionId];
};

const recordVote = async (motionId: string) => {
  recordingMotionId.value = motionId;
  recordedMotionId.value = '';

  try {
    const form = voteForm(motionId);
    const motion = selectedMotions.value.find((m: any) => m.id === motionId);
    if (!motion) return;
    if (motion.isClosed) return;

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
    recordedMotionId.value = motionId;
    collapsedVotePanels.value[motionId] = true;
    window.setTimeout(() => {
      if (recordedMotionId.value === motionId) recordedMotionId.value = '';
    }, 2500);
  } finally {
    recordingMotionId.value = '';
  }
};

const latestVote = (motion: any) => {
  if (!motion?.votes?.length) return null;
  return motion.votes[motion.votes.length - 1];
};

const isVotePanelCollapsed = (motion: any) => Boolean(motion?.isClosed) || Boolean(collapsedVotePanels.value[motion?.id]);

const openVotePanel = async (motionId: string) => {
  reopeningMotionId.value = motionId;
  try {
    await api.post(`/meetings/motions/${motionId}/reopen`);
    collapsedVotePanels.value[motionId] = false;
    await refreshSelectedMode();
  } finally {
    reopeningMotionId.value = '';
  }
};

const collapsedSummaryText = (motion: any) => {
  const v = latestVote(motion);
  if (!v) return 'No vote summary available.';
  if (motionType(motion) === 'ELECTION') {
    const totals = electionTotals(motion).map((t) => `${t.candidate}: ${t.shares}`).join(' · ');
    return totals || 'Election totals recorded.';
  }
  return `Yes ${v.yesShares} · No ${v.noShares} · Abstain ${v.abstainShares} · ${v.result}`;
};

const electionWinnersText = (motion: any) => {
  const details = latestVote(motion)?.detailsJson;
  if (!details || typeof details !== 'object') return 'Not available';
  const winners = (details as any).winners;
  if (!Array.isArray(winners) || winners.length === 0) return 'No winner recorded';
  return winners.map((w: unknown) => String(w)).join(', ');
};

const proxyForGrantor = (shareholderId: string) => {
  return proxies.value.find((p: any) => p.grantorId === shareholderId && p.status === 'Verified');
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
