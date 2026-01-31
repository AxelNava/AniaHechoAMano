<script setup lang="ts">
import { inject, type HTMLAttributes } from 'vue'
import { PanelLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SidebarContext } from './SidebarProvider.vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const sidebar = inject<SidebarContext>('sidebar')

if (!sidebar) {
  throw new Error('SidebarTrigger must be used within a SidebarProvider')
}
</script>

<template>
  <Button
    data-sidebar="trigger"
    variant="ghost"
    size="icon"
    :class="cn('h-7 w-7', props.class)"
    @click="sidebar.toggleSidebar"
  >
    <PanelLeft />
    <span class="sr-only">Toggle Sidebar</span>
  </Button>
</template>
