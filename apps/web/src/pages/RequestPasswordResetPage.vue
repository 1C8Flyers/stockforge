<template>
  <section class="flex min-h-screen items-center justify-center p-4">
    <Card class="w-full max-w-md">
      <h2 class="text-2xl font-semibold text-slate-900">Request password reset</h2>
      <p class="mt-1 text-sm text-slate-600">Enter your account email and we'll send a reset link.</p>
      <form @submit.prevent="submit" class="mt-4 grid gap-3">
        <Input v-model="email" label="Email" type="email" />
        <Button type="submit" :loading="loading">Send reset link</Button>
        <p v-if="message" class="text-sm" :class="tone === 'error' ? 'text-red-600' : 'text-emerald-700'">{{ message }}</p>
      </form>
      <RouterLink to="/login" class="mt-3 inline-block text-sm text-brand-700 hover:underline">Back to login</RouterLink>
    </Card>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api';
import Button from '../components/ui/Button.vue';
import Card from '../components/ui/Card.vue';
import Input from '../components/ui/Input.vue';

const email = ref('');
const loading = ref(false);
const message = ref('');
const tone = ref<'success' | 'error'>('success');

const submit = async () => {
  loading.value = true;
  message.value = '';
  try {
    await api.post('/auth/request-password-reset', { email: email.value.trim() });
    tone.value = 'success';
    message.value = 'If that account exists, a reset link has been sent.';
  } catch {
    tone.value = 'error';
    message.value = 'Unable to process request right now.';
  } finally {
    loading.value = false;
  }
};
</script>
