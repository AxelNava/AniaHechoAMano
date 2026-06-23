<script setup lang="ts">
import type { PedidoHistorialListItemDto } from "@/types/orders/orderHistoryDto";
import { formatCurrency } from "@/utils/orderDisplay";

defineProps<{
  row: PedidoHistorialListItemDto;
  value: unknown;
}>();
</script>

<template>
  <span class="font-semibold text-text-page">
    {{ formatCurrency(row.precio_final_total) }}
  </span>
</template>
