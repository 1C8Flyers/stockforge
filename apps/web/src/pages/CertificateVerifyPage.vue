<template>
  <section class="flex min-h-screen items-center justify-center p-4">
    <Card class="w-full max-w-2xl">
      <h2 class="text-2xl font-semibold text-slate-900">Certificate Verification</h2>
      <p class="mt-1 text-sm text-slate-600">Verification ID: {{ verificationId }}</p>

      <div v-if="loading" class="mt-4 text-sm text-slate-600">Checking certificate...</div>

      <template v-else>
        <div class="mt-4 rounded-lg border p-4" :class="result?.valid ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'">
          <p class="text-sm font-semibold" :class="result?.valid ? 'text-emerald-800' : 'text-amber-800'">
            {{ result?.message || 'Unable to verify certificate.' }}
          </p>
        </div>

        <div v-if="result && result.certificateNumber" class="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p><span class="font-semibold text-slate-900">Certificate:</span> {{ result.certificateNumber }}</p>
          <p><span class="font-semibold text-slate-900">Owner:</span> {{ result.ownerName || '—' }}</p>
          <p><span class="font-semibold text-slate-900">Shares:</span> {{ result.shares ?? '—' }}</p>
          <p><span class="font-semibold text-slate-900">Lot status:</span> {{ result.lotStatus || '—' }}</p>
        </div>

        <p v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>
      </template>
    </Card>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Card from '../components/ui/Card.vue';

const route = useRoute();
const loading = ref(true);
const error = ref('');
const result = ref<any>(null);

const verificationId = computed(() => String(route.params.verificationId || ''));
const sig = computed(() => String(route.query.sig || ''));

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await axios.get(`${baseURL}/certificates/verify/${encodeURIComponent(verificationId.value)}`, {
      params: { sig: sig.value }
    });
    result.value = data;
  } catch {
    error.value = 'Verification service is unavailable.';
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>
