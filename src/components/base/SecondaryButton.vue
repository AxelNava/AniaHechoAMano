<script setup lang="ts">
defineProps<{
  url?: string
  selected?: boolean
}>()
</script>

<template>
  <a
    :href="url || '#'"
    class="text-text-page text-center border-2 font-sans-serif text-[1.1rem] text-sm px-6 py-3 inline-block rounded-3xl transition-[color,background-color,translate] duration-200 hover:-translate-y-1 cursor-pointer"
    :class="[
      selected
        ? 'bg-text-page border-text-page text-white'
        : 'bg-white border-text-page hover:bg-text-page hover:text-white'
    ]"
  >
    <slot />
  </a>
</template>
