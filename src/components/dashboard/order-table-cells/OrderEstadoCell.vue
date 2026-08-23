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
  <span
    v-if="row.retrasado"
    class="ml-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-amber-100 text-amber-800 ring-amber-600/20"
  >
    Retrasado
  </span>
</template>
