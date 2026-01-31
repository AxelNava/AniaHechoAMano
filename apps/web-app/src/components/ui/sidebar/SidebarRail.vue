<script setup lang="ts">
import { inject, type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import type { SidebarContext } from './SidebarProvider.vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const sidebar = inject<SidebarContext>('sidebar')

function toggleSidebar() {
  sidebar?.toggleSidebar()
}
</script>

<template>
  <button
    data-sidebar="rail"
    aria-label="Toggle Sidebar"
    :tabindex="-1"
    :class="cn(
      'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:-left-4 md:inline-flex',
      '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
      '[[data-side=left][data-state=expanded]_&]:cursor-w-resize [[data-side=right][data-state=expanded]_&]:cursor-e-resize',
      'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar',
      props.class
    )"
    @click="toggleSidebar"
  >
    <slot />
  </button>
</template>
