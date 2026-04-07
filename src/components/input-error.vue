<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  message?: string
  class?: string
}>()
</script>

<template>
  <p v-if="message" :class="cn('text-sm text-red-600 dark:text-red-400', $props.class)">
    {{ message }}
  </p>
</template>
