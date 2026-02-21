<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-xl font-semibold text-slate-900">User Manual</h2>
      <p class="text-sm text-slate-600">Operational reference for StockForge workflows and rules.</p>
    </div>

    <Card class="prose prose-slate max-w-none">
      <h3>What this app does</h3>
      <ul>
        <li>Manage shareholders, lots (certificates), transfers, meetings/proxies, and reports.</li>
        <li>Ownership is calculated from active lots.</li>
        <li>Posted transfers are immutable.</li>
      </ul>

      <h3>Roles</h3>
      <ul>
        <li><strong>Admin</strong>: full access, settings, users/roles/passwords.</li>
        <li><strong>Officer</strong>: operational writes and transfer posting.</li>
        <li><strong>Clerk</strong>: draft/data-entry writes only.</li>
        <li><strong>ReadOnly</strong>: view only.</li>
      </ul>

      <h3>Key business rules</h3>
      <ul>
        <li><strong>Certificate number</strong> can be set only on lot creation; blank auto-generates from 1000+.</li>
        <li><strong>Share quantity</strong> is immutable after lot creation.</li>
        <li><strong>Treasury</strong> and <strong>Surrendered</strong> lots are excluded from voting.</li>
        <li>Owner statuses excluded from voting: <code>Inactive</code>, <code>DeceasedOutstanding</code>, <code>DeceasedSurrendered</code>.</li>
        <li><strong>Retired Shares</strong> is the null-owner transfer bucket.</li>
      </ul>

      <h3>Typical workflow</h3>
      <ol>
        <li>Create/update shareholders.</li>
        <li>Create lots for owners (certificate optional).</li>
        <li>Create transfer drafts and post when finalized.</li>
        <li>Create meetings and capture proxies/votes.</li>
        <li>Export cap table and meeting proxy reports.</li>
      </ol>

      <h3>Admin settings</h3>
      <ul>
        <li>System health and migration count.</li>
        <li>Voting config: disputed-lot exclusion toggle.</li>
        <li>Branding: app display name + logo URL.</li>
        <li>User management: create users, change roles, reset passwords.</li>
      </ul>

      <h3>Troubleshooting</h3>
      <ul>
        <li>If UI seems stale after deploy, hard refresh browser cache.</li>
        <li>If API appears offline, verify running containers and NAS ports.</li>
      </ul>
    </Card>
  </section>
</template>

<script setup lang="ts">
import Card from '../components/ui/Card.vue';
</script>
