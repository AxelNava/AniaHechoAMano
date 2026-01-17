<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Link } from '@inertiajs/vue3'

defineProps<{
  href: string
  class?: string
}>()
</script>

<template>
  <Link
    :href="href"
    :class="cn(
      'text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500',
      $props.class,
    )"
  >
    <slot />
  </Link>
</template>
