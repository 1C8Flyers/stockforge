<template>
  <div class="mx-auto mt-16 w-full max-w-md">
    <Card class="space-y-4">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Shareholder Portal Login</h1>
        <p class="text-sm text-slate-600">Tenant: {{ tenantSlug }}</p>
      </div>

      <form class="space-y-3" @submit.prevent="submit">
        <Input v-model="email" type="email" label="Email" placeholder="you@example.com" />
        <Input v-model="password" type="password" label="Password" placeholder="••••••••" />
        <p v-if="error" class="text-sm text-rose-700">{{ error }}</p>
        <Button type="submit" :loading="loading" class="w-full">Sign in</Button>
      </form>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';
import Card from '../components/ui/Card.vue';
import Input from '../components/ui/Input.vue';
import Button from '../components/ui/Button.vue';
import { getPortalBasePath, getTenantSlug } from '../portalTenant';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const tenantSlug = computed(() => getTenantSlug(route));
const portalHomePath = computed(() => getPortalBasePath(route));

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const { data } = await api.post('/auth/login', { email: email.value.trim(), password: password.value });
    auth.setSession(data.token, data.user);
    router.push(portalHomePath.value);
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Login failed.';
  } finally {
    loading.value = false;
  }
}
</script>
