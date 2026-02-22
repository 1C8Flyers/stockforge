<template>
  <section class="flex min-h-screen items-center justify-center p-4">
    <Card class="w-full max-w-md">
      <h2 class="text-2xl font-semibold text-slate-900">Set a new password</h2>
      <p class="mt-1 text-sm text-slate-600">Use your reset token link to set a new password.</p>
      <form @submit.prevent="submit" class="mt-4 grid gap-3">
        <Input v-model="password" label="New password" type="password" />
        <Input v-model="confirm" label="Confirm password" type="password" />
        <Button type="submit" :loading="loading">Reset password</Button>
        <p v-if="message" class="text-sm" :class="tone === 'error' ? 'text-red-600' : 'text-emerald-700'">{{ message }}</p>
      </form>
      <RouterLink to="/login" class="mt-3 inline-block text-sm text-brand-700 hover:underline">Back to login</RouterLink>
    </Card>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { api } from '../api';
import Button from '../components/ui/Button.vue';
import Card from '../components/ui/Card.vue';
import Input from '../components/ui/Input.vue';

const route = useRoute();
const token = computed(() => String(route.query.token || ''));
const password = ref('');
const confirm = ref('');
const loading = ref(false);
const message = ref('');
const tone = ref<'success' | 'error'>('success');

const submit = async () => {
  message.value = '';
  if (!token.value) {
    tone.value = 'error';
    message.value = 'Reset token is missing.';
    return;
  }
  if (password.value.length < 8) {
    tone.value = 'error';
    message.value = 'Password must be at least 8 characters.';
    return;
  }
  if (password.value !== confirm.value) {
    tone.value = 'error';
    message.value = 'Passwords do not match.';
    return;
  }

  loading.value = true;
  try {
    await api.post('/auth/reset-password', { token: token.value, newPassword: password.value });
    tone.value = 'success';
    message.value = 'Password reset complete. You can now sign in.';
    password.value = '';
    confirm.value = '';
  } catch (error: any) {
    tone.value = 'error';
    message.value = error?.response?.data?.message || 'Unable to reset password.';
  } finally {
    loading.value = false;
  }
};
</script>
