<script setup lang="ts">
import type { ComponenteDto } from "@/types/products/ComponenteDto";

defineProps<{
  row: ComponenteDto;
  value: unknown;
}>();
</script>

<template>
  <div class="min-w-96">
    <p class="font-medium text-text-page">{{ row.nombre }}</p>
    <p class="text-sm text-text-page2">{{ row.descripcion || "Sin descripción" }}</p>
  </div>
</template>
