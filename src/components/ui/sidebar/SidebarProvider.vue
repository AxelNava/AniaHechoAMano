<script setup lang="ts">
import { ref, provide, computed, type HTMLAttributes, type ComputedRef, type Ref } from 'vue'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

export interface SidebarContext {
  state: ComputedRef<'expanded' | 'collapsed'>
  open: Ref<boolean>
  setOpen: (value: boolean) => void
  openMobile: Ref<boolean>
  setOpenMobile: (value: boolean) => void
  isMobile: Ref<boolean>
  toggleSidebar: () => void
}

const props = withDefaults(defineProps<{
  defaultOpen?: boolean
  open?: boolean
  class?: HTMLAttributes['class']
}>(), {
  defaultOpen: true,
})

const isMobile = useIsMobile()
const openMobile = ref(false)

const _open = ref(props.defaultOpen)
const open = computed({
  get: () => props.open !== undefined ? props.open : _open.value,
  set: (value) => {
    if (props.open !== undefined) {
      // emit update if needed, but for now we'll just update local
    }
    _open.value = value
  }
})

function setOpen(value: boolean) {
  open.value = value
}

function setOpenMobile(value: boolean) {
  openMobile.value = value
}

function toggleSidebar() {
  return isMobile.value
    ? setOpenMobile(!openMobile.value)
    : setOpen(!open.value)
}

provide('sidebar', {
  state: computed(() => isMobile.value ? (openMobile.value ? 'expanded' : 'collapsed') : (open.value ? 'expanded' : 'collapsed')),
  open,
  setOpen,
  openMobile,
  setOpenMobile,
  isMobile,
  toggleSidebar,
})
</script>

<template>
  <div
    :style="{
      '--sidebar-width': '16rem',
      '--sidebar-width-icon': '3rem',
    }"
    :class="cn('group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar', props.class)"
  >
    <slot />
  </div>
</template>
