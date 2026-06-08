<script setup lang="ts">
import type { ProductDto } from "@/types/products/ProductDto";

defineProps<{
  row: ProductDto;
  value: unknown;
}>();
</script>

<template>
  <span class="text-sm font-medium text-green-600">${{ row.precio_base }}</span>
</template>
