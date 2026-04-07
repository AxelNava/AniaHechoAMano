<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
</script>

<template>
  <div class="product-layout grid grid-rows-[auto_1fr_auto] min-h-screen">
    <AppHeader />
    <main class="container mx-auto px-4 py-8">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.product-layout {
  background-color: var(--color-background);
}
</style>
