<template>
  <section class="space-y-4">
    <h2 class="text-xl font-semibold text-slate-900">Reports</h2>
    <Card class="space-y-3">
      <p class="text-sm text-slate-600">Download compliance and meeting exports.</p>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        <Button @click="download('/reports/cap-table.csv', 'ownership-report.csv')">Ownership Report CSV</Button>
        <Button variant="secondary" @click="download('/reports/cap-table.pdf', 'ownership-report.pdf')">Ownership Report PDF</Button>
        <div class="min-w-[260px] flex-1">
          <Select v-model="meetingId" label="Meeting for proxy report">
            <option value="">Meeting for proxy report</option>
            <option v-for="m in meetings" :value="m.id" :key="m.id">{{ m.title }}</option>
          </Select>
        </div>
        <Button v-if="meetingId" variant="secondary" @click="download(`/reports/meeting-proxy.csv?meetingId=${meetingId}`, `meeting-proxy-${meetingId}.csv`)">Meeting Proxy CSV</Button>
        <Button v-if="meetingId" variant="secondary" @click="download(`/reports/meeting-proxy.pdf?meetingId=${meetingId}`, `meeting-proxy-${meetingId}.pdf`)">Meeting Proxy PDF</Button>
        <Button v-if="meetingId" variant="secondary" @click="download(`/reports/meeting-report.pdf?meetingId=${meetingId}`, `meeting-report-${meetingId}.pdf`)">Meeting Report PDF</Button>
        <Button v-if="meetingId" variant="secondary" :loading="isEmailingReport" @click="emailMeetingReport('officers')">Email Meeting Report</Button>
        <Button v-if="meetingId" variant="ghost" :loading="isEmailingReport" @click="emailMeetingReport('me')">Send test to me</Button>
      </div>
      <p v-if="emailMessage" class="text-sm" :class="emailTone === 'error' ? 'text-red-600' : 'text-emerald-700'">{{ emailMessage }}</p>
    </Card>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api';
import Button from '../components/ui/Button.vue';
import Card from '../components/ui/Card.vue';
import Select from '../components/ui/Select.vue';

const meetingId = ref('');
const meetings = ref<any[]>([]);
const isEmailingReport = ref(false);
const emailMessage = ref('');
const emailTone = ref<'success' | 'error'>('success');

const download = async (url: string, fallbackFilename: string) => {
  const response = await api.get(url, { responseType: 'blob' });
  const contentDisposition = String(response.headers['content-disposition'] || '');
  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || fallbackFilename;
  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

const emailMeetingReport = async (mode: 'officers' | 'me') => {
  if (!meetingId.value) return;
  isEmailingReport.value = true;
  emailMessage.value = '';
  try {
    const { data } = await api.post(`/meetings/${meetingId.value}/email-report`, {
      recipientMode: mode
    });
    emailTone.value = 'success';
    emailMessage.value = data?.ok ? `Meeting report emailed (${data.recipientsCount || 0} recipient${data.recipientsCount === 1 ? '' : 's'}).` : 'Meeting report email completed.';
  } catch (error: any) {
    emailTone.value = 'error';
    emailMessage.value = error?.response?.data?.message || error?.response?.data?.error || 'Unable to email meeting report.';
  } finally {
    isEmailingReport.value = false;
  }
};

onMounted(async () => {
  meetings.value = (await api.get('/meetings')).data;
});
</script>
