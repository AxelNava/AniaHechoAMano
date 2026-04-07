<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  variant?: 'header' | 'sidebar'
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'header',
})
</script>

<template>
  <main
    v-if="variant === 'header'"
    :class="cn('mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl', props.class)"
  >
    <slot />
  </main>
  <div
    v-else
    :class="cn('flex flex-1 flex-col', props.class)"
  >
    <slot />
  </div>
</template>
