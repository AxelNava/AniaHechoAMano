<script setup lang="ts">
const { variant = 'header' } = defineProps<{
  variant?: 'header' | 'sidebar'
}>()
</script>

<template>
  <div v-if="variant === 'header'" class="flex min-h-screen w-full flex-col">
    <slot />
  </div>
  <div v-else class="flex min-h-screen w-full">
    <slot />
  </div>
</template>
