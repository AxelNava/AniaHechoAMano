<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <main
    :class="cn(
      'relative flex min-h-svh flex-1 flex-col bg-background',
      'peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] peer-data-[variant=inset]:m-2 peer-data-[variant=inset]:rounded-xl peer-data-[variant=inset]:shadow peer-data-[variant=inset]:peer-data-[state=collapsed]:m-2',
      props.class
    )"
  >
    <slot />
  </main>
</template>
