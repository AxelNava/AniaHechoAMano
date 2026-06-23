<script setup lang="ts">
import AppContent from '@/components/app-content.vue'
import AppShell from '@/components/app-shell.vue'
import AdminHeader from '@/components/AdminHeader.vue'
import BreadCrumbs from '@/components/BreadCrumbs.vue'
import type { BreadcrumbItem } from '@/types'

defineProps<{
  breadcrumbs?: BreadcrumbItem[]
}>()
</script>

<template>
  <AppShell variant="header">
    <AdminHeader />
    <AppContent variant="header" class="overflow-x-hidden flex-1 bg-white dark:bg-gray-950 pt-6">
      <div v-if="breadcrumbs && breadcrumbs.length > 0" class="px-4 mb-4">
        <BreadCrumbs :breadcrumbs="breadcrumbs" />
      </div>
      <slot />
    </AppContent>
  </AppShell>
</template>
