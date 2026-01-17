<script setup lang="ts">
import { Head, Link, usePage } from '@inertiajs/vue3'
import type { SharedData } from '@/types'
import { computed } from 'vue'

const page = usePage<SharedData>()
const user = computed(() => page.props.auth.user)
</script>

<template>
  <Head title="Welcome" />
  <div class="flex min-h-screen flex-col items-center justify-center bg-[#FDFDFC] p-6 text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
    <main class="flex w-full max-w-lg flex-col items-center gap-8">
      <div class="flex flex-col items-center gap-4 text-center">
        <h1 class="text-4xl font-bold tracking-tight">Ania</h1>
        <p class="text-lg text-muted-foreground">Welcome to Ania, your new favorite app.</p>
      </div>

      <div class="flex gap-4">
        <template v-if="user">
          <Link href="/dashboard" class="rounded-md bg-[#1b1b18] px-4 py-2 text-white hover:bg-[#1b1b18]/90 dark:bg-[#EDEDEC] dark:text-[#0a0a0a]">
            Go to Dashboard
          </Link>
        </template>
        <template v-else>
          <Link href="/login" class="rounded-md border border-input bg-background px-4 py-2 hover:bg-accent hover:text-accent-foreground">
            Log in
          </Link>
          <Link href="/register" class="rounded-md bg-[#1b1b18] px-4 py-2 text-white hover:bg-[#1b1b18]/90 dark:bg-[#EDEDEC] dark:text-[#0a0a0a]">
            Register
          </Link>
        </template>
      </div>
    </main>
  </div>
</template>
