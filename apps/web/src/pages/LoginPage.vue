<template>
  <section class="flex min-h-screen items-center justify-center p-4">
    <Card class="w-full max-w-md">
      <h2 class="text-2xl font-semibold text-slate-900">Sign in</h2>
      <p class="mt-1 text-sm text-slate-600">StockForge account access</p>
      <form @submit.prevent="submit" class="mt-4 grid gap-3">
        <Input v-model="email" label="Email" type="email" />
        <Input v-model="password" label="Password" type="password" />
        <Button type="submit">Sign in</Button>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      </form>
    </Card>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';
import Button from '../components/ui/Button.vue';
import Card from '../components/ui/Card.vue';
import Input from '../components/ui/Input.vue';

const router = useRouter();
const auth = useAuthStore();
const email = ref('admin@example.com');
const password = ref('ChangeMe123!');
const error = ref('');

const submit = async () => {
  error.value = '';
  try {
    const { data } = await api.post('/auth/login', { email: email.value, password: password.value });
    auth.setSession(data.token, data.user);
    router.push('/');
  } catch {
    error.value = 'Invalid credentials';
  }
};
</script>
