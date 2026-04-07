<script setup lang="ts">
import BreadCrumbs from '@/components/BreadCrumbs.vue'
import { SidebarTrigger } from '@/components/ui/sidebar'
import type { BreadcrumbItem } from '@/types'

defineProps<{
  breadcrumbs?: BreadcrumbItem[]
}>()
</script>

<template>
  <header class="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
    <div class="flex items-center gap-2">
      <SidebarTrigger class="-ml-1" />
      <BreadCrumbs :breadcrumbs="breadcrumbs || []" />
    </div>
  </header>
</template>
