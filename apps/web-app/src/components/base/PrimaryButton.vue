<script setup lang="ts">
defineProps<{
  url?: string
  selected?: boolean
  extraClasses?: string
}>()
</script>

<template>
  <a
    :href="url || '#'"
    class="text-text-page text-center border-2 font-sans-serif text-sm px-4 py-2 inline-block rounded-4xl transition-[color,background-color,translate] duration-200 hover:-translate-y-1"
    :class="[
      extraClasses,
      selected ? 'bg-text-page border-text-page text-white' : 'border-secondary hover:bg-secondary'
    ]"
  >
    <slot />
  </a>
</template>
