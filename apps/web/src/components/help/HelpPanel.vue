<template>
  <Drawer :open="open" @close="$emit('close')">
    <div class="flex h-full flex-col">
      <header class="border-b border-slate-200 p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Page Help</h2>
            <p class="text-sm text-slate-600">{{ pageTitle }}</p>
          </div>
          <Button variant="ghost" @click="$emit('close')">Close</Button>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto p-4">
        <Card v-if="rendered" class="prose prose-slate max-w-none">
          <div v-html="rendered" />
        </Card>
        <Card v-else class="space-y-2">
          <h3 class="font-semibold text-slate-900">No help content yet</h3>
          <p class="text-sm text-slate-600">Help for this page is coming soon.</p>
        </Card>
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import Drawer from '../ui/Drawer.vue';
import Card from '../ui/Card.vue';
import Button from '../ui/Button.vue';

const props = defineProps<{
  open: boolean;
  pageTitle: string;
  markdown: string;
}>();

defineEmits<{ (e: 'close'): void }>();

const rendered = computed(() => {
  if (!props.markdown.trim()) return '';
  return String(marked.parse(props.markdown));
});
</script>
