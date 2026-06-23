<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { LoadingStatus } from '@/composables/useLoadingButton'

interface Props {
  loading: boolean
  status: LoadingStatus
  message: string
  disabled?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <button
      :disabled="loading || disabled"
      :class="[
        'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-[color,box-shadow] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 px-4 py-2',
        props.class
      ]"
    >
      <svg
        v-if="loading"
        class="animate-spin h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <slot />
    </button>

    <p
      v-if="message && status !== 'idle'"
      :class="[
        'text-sm font-medium text-center',
        status === 'loading' && 'text-amber-600',
        status === 'error' && 'text-destructive',
        status === 'success' && 'text-green-600'
      ]"
    >
      {{ message }}
    </p>
  </div>
</template>