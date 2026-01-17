<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/appStore'

const appStore = useAppStore()
const user = computed(() => appStore.user)

onMounted(() => {
  document.title = 'Welcome'
})
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-[#FDFDFC] p-6 text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
    <main class="flex w-full max-w-lg flex-col items-center gap-8">
      <div class="flex flex-col items-center gap-4 text-center">
        <h1 class="text-4xl font-bold tracking-tight">Artisan</h1>
        <p class="text-lg text-muted-foreground">Welcome to Artisan, your handcrafted marketplace.</p>
      </div>

      <div class="flex gap-4">
        <template v-if="user">
          <RouterLink to="/dashboard" class="rounded-md bg-[#1b1b18] px-4 py-2 text-white hover:bg-[#1b1b18]/90 dark:bg-[#EDEDEC] dark:text-[#0a0a0a]">
            Go to Dashboard
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/login" class="rounded-md border border-input bg-background px-4 py-2 hover:bg-accent hover:text-accent-foreground">
            Log in
          </RouterLink>
          <RouterLink to="/register" class="rounded-md bg-[#1b1b18] px-4 py-2 text-white hover:bg-[#1b1b18]/90 dark:bg-[#EDEDEC] dark:text-[#0a0a0a]">
            Register
          </RouterLink>
        </template>
      </div>
    </main>
  </div>
</template>
