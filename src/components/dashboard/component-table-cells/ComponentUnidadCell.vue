<script setup lang="ts">
import type { ComponenteDto } from "@/types/products/ComponenteDto";

defineProps<{
  row: ComponenteDto;
  value: unknown;
}>();
</script>

<template>
  <span class="text-sm text-text-page2">{{ row.unidad_medida }}</span>
</template>
