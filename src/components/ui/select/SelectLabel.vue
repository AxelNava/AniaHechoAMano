<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { SelectLabel, type SelectLabelProps } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = defineProps<SelectLabelProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})
</script>

<template>
  <SelectLabel
    v-bind="delegatedProps"
    :class="cn('text-muted-foreground px-2 py-1.5 text-xs font-semibold', props.class)"
  >
    <slot />
  </SelectLabel>
</template>
