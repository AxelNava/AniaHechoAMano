<script setup lang="ts">
import AppContent from '@/components/app-content.vue'
import AppShell from '@/components/app-shell.vue'
import AppSidebar from '@/components/app-sidebar.vue'
import AppSidebarHeader from '@/components/app-sidebar-header.vue'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import type { BreadcrumbItem, SharedData } from '@/types'
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

defineProps<{
  breadcrumbs?: BreadcrumbItem[]
}>()

const page = usePage<SharedData>()
const sidebarOpen = computed(() => page.props.sidebarOpen)
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
