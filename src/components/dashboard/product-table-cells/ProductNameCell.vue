<script setup lang="ts">
import type { ProductDto } from "@/types/products/ProductDto";

defineProps<{
  row: ProductDto;
  value: unknown;
}>();
</script>

<template>
  <div class="flex-1 min-w-50">
    <p class="font-medium text-gray-800">{{ row.nombre }}</p>
    <p class="text-sm text-gray-500">{{ row.descripcion || "Sin descripción" }}</p>
  </div>
</template>
