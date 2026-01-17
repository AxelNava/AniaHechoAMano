<script setup lang="ts">
import AppContent from '@/components/app-content.vue'
import AppShell from '@/components/app-shell.vue'
import AppSidebar from '@/components/app-sidebar.vue'
import AppSidebarHeader from '@/components/app-sidebar-header.vue'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import type { BreadcrumbItem } from '@/types'
import { computed } from 'vue'
import { useAppStore } from '@/stores/appStore'

defineProps<{
  breadcrumbs?: BreadcrumbItem[]
}>()

const appStore = useAppStore()
const sidebarOpen = computed(() => appStore.sidebarOpen)
</script>

<template>
  <SidebarProvider :default-open="sidebarOpen">
    <AppShell variant="sidebar">
      <AppSidebar />
      <SidebarInset>
        <AppContent variant="sidebar" class="overflow-x-hidden">
          <AppSidebarHeader :breadcrumbs="breadcrumbs" />
          <slot />
        </AppContent>
      </SidebarInset>
    </AppShell>
  </SidebarProvider>
</template>
