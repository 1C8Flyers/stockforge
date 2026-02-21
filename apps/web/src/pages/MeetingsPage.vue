<template>
  <section>
    <h2>Meetings & Proxies</h2>
    <p v-if="!canWrite" style="color:#666;">Read-only mode: meeting/proxy create actions are disabled.</p>
    <form v-if="canWrite" @submit.prevent="createMeeting" style="display:flex;gap:8px;margin-bottom:12px;">
      <input v-model="meetingForm.title" placeholder="Meeting title" required />
      <input v-model="meetingForm.dateTime" type="datetime-local" required />
      <button>Create meeting</button>
    </form>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <h3>Meetings</h3>
        <table border="1" cellpadding="6" width="100%"><thead><tr><th>Title</th><th>Date</th><th>Represented</th></tr></thead>
          <tbody>
            <tr v-for="m in meetings" :key="m.id" @click="selectMeeting(m.id)" style="cursor:pointer">
              <td>{{ m.title }}</td><td>{{ new Date(m.dateTime).toLocaleString() }}</td><td>{{ mode[m.id]?.representedShares || 0 }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <h3>Proxies (selected meeting)</h3>
        <form v-if="canWrite" @submit.prevent="createProxy" style="display:grid;gap:6px;">
          <select v-model="proxyForm.grantorId"><option value="">Grantor</option><option v-for="s in shareholders" :value="s.id" :key="s.id">{{ displayName(s) }}</option></select>
          <input v-model="proxyForm.proxyHolderName" placeholder="Proxy holder name" />
          <button :disabled="!selectedMeetingId">Create proxy</button>
        </form>
        <p v-else style="color:#666;">Read-only mode: cannot create proxies.</p>
        <ul><li v-for="p in proxies" :key="p.id">{{ p.proxyHolderName }} - {{ p.status }} - {{ p.proxySharesSnapshot }} shares</li></ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';

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

onMounted(load);
</script>
