<template>
  <section style="max-width:360px;margin:40px auto;">
    <h2>Login</h2>
    <form @submit.prevent="submit" style="display:grid;gap:8px;">
      <input v-model="email" placeholder="Email" type="email" required />
      <input v-model="password" placeholder="Password" type="password" required />
      <button>Sign in</button>
      <p v-if="error" style="color:red">{{ error }}</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';

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
