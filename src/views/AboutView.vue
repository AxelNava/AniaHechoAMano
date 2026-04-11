<script setup lang="ts">
import DarkModeToggle from "@/components/DarkModeToggle.vue";
</script>

<template>
  <div class="about min-h-screen bg-background dark:bg-gray-900">
    <div class="absolute right-4 top-4">
      <DarkModeToggle />
    </div>
    <h1 class="text-foreground dark:text-white">This is an about page</h1>
  </div>
</template>

<style scoped>
.about {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
</style>
