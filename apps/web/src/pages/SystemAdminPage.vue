<template>
  <section class="min-h-screen bg-slate-100 p-6 sm:p-10">
    <div class="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">System Admin</h1>
        <p class="mt-1 text-sm text-slate-600">Restricted area for system-wide administration.</p>
      </div>

      <Card class="space-y-4 p-5">
        <p class="text-sm text-slate-700">
          This page is intentionally outside the standard app shell and intended for system-level operations.
        </p>

        <div class="flex flex-wrap gap-2">
          <Button variant="secondary" @click="goToTenantAdmin">Open Tenant Admin</Button>
          <Button variant="ghost" @click="goHome">Back to App</Button>
          <Button variant="danger" @click="logout">Logout</Button>
        </div>
      </Card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Button from '../components/ui/Button.vue';
import Card from '../components/ui/Card.vue';

const router = useRouter();
const auth = useAuthStore();

const goToTenantAdmin = () => {
  router.push('/admin');
};

const goHome = () => {
  router.push('/');
};

const logout = () => {
  auth.clear();
  router.push('/login');
};
</script>
