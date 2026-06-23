<script setup lang="ts">
import type { PedidoHistorialListItemDto } from "@/types/orders/orderHistoryDto";
import { getEstadoColor, getEstadoLabel } from "@/utils/orderDisplay";

defineProps<{
  row: PedidoHistorialListItemDto;
  value: unknown;
}>();
</script>

<template>
  <span
    :class="[
      'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
      getEstadoColor(row.estado),
    ]"
  >
    {{ getEstadoLabel(row.estado) }}
  </span>
</template>
