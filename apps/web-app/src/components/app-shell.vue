<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

interface Props {
  variant?: 'header' | 'sidebar'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'header',
})

const page = usePage()
// @ts-ignore
const isOpen = computed(() => page.props.sidebarOpen)
</script>

<template>
  <div v-if="variant === 'header'" class="flex min-h-screen w-full flex-col">
    <slot />
  </div>
  <div v-else class="flex min-h-screen w-full">
    <slot />
  </div>
</template>
