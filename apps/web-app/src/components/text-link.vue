<script setup lang="ts">
import { cn } from '@/lib/utils'
import { RouterLink } from 'vue-router'

defineProps<{
  href: string
  class?: string
}>()
</script>

<template>
  <RouterLink
    :to="href"
    :class="cn(
      'text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500',
      $props.class,
    )"
  >
    <slot />
  </RouterLink>
</template>
