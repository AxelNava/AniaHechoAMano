<script setup lang="ts">
defineProps<{
  className?: string
}>()
</script>

<template>
  <h1 
    class="font-dancing text-[2.5rem] mx-auto w-fit"
    :class="className"
  >
    <slot />
  </h1>
</template>
