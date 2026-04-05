<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="mb-8 space-y-0.5">
    <h2 class="text-xl font-semibold tracking-tight">{{ title }}</h2>
    <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
  </div>
</template>
