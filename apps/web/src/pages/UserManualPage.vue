<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-xl font-semibold text-slate-900">User Manual</h2>
      <p class="text-sm text-slate-600">Operational reference for StockForge workflows and rules.</p>
    </div>

    <Card class="prose prose-slate max-w-none">
      <div v-html="renderedManualHtml" />
    </Card>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import Card from '../components/ui/Card.vue';
import userManualMarkdown from '../../../../USER_MANUAL.md?raw';

const renderedManualHtml = computed(() => String(marked.parse(userManualMarkdown)));
</script>
