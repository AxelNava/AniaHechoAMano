<script setup lang="ts">
import type { PedidoHistorialListItemDto } from "@/types/orders/orderHistoryDto";

defineProps<{
  row: PedidoHistorialListItemDto;
  value: unknown;
}>();
</script>

<template>
  <span class="text-text-page2">{{ row.categoria || "—" }}</span>
</template>
