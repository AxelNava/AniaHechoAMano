<script setup lang="ts">
import AdminHeader from "@/components/AdminHeader.vue";
import AppShell from "@/components/app-shell.vue";
import AppContent from "@/components/app-content.vue";
</script>

<template>
  <AppShell variant="header">
    <AdminHeader />
    <AppContent variant="header" class="overflow-x-hidden flex-1 bg-white dark:bg-gray-950 pt-6">
      <router-view />
    </AppContent>
  </AppShell>
</template>