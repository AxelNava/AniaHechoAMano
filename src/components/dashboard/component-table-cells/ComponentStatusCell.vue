<script setup lang="ts">
import type { ComponenteDto } from "@/types/products/ComponenteDto";

defineProps<{
  row: ComponenteDto;
  value: unknown;
}>();
</script>

<template>
  <span
    :class="[
      'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
      row.activo !== false
        ? 'bg-primary text-text-page ring-secondary'
        : 'bg-gray-100 text-gray-500 ring-gray-200',
    ]"
  >
    {{ row.activo !== false ? "Activo" : "Inactivo" }}
  </span>
</template>
