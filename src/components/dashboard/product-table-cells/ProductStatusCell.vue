<script setup lang="ts">
import type { ProductDto } from "@/types/products/ProductDto";

defineProps<{
  row: ProductDto;
  value: unknown;
}>();
</script>

<template>
  <span
    :class="[
      'inline-flex px-2 py-1 rounded-full text-xs',
      row.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600',
    ]"
  >
    {{ row.activo ? "Activo" : "Inactivo" }}
  </span>
</template>
