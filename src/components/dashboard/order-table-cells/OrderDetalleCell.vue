<script setup lang="ts">
import { computed } from "vue";
import type { RouteLocationRaw } from "vue-router";
import type { PedidoHistorialListItemDto } from "@/types/orders/orderHistoryDto";

const props = defineProps<{
  row: PedidoHistorialListItemDto;
  value: unknown;
}>();

// Si el pedido tiene un producto base, abre el detalle dentro del flujo del
// producto; si no (pedido sólo personalizado), usa la ruta global.
const to = computed<RouteLocationRaw>(() =>
  props.row.producto_id !== null
    ? {
        name: "admin-product-order-detail",
        params: { id: props.row.producto_id, pedidoId: props.row.id },
      }
    : { name: "admin-order-detail", params: { pedidoId: props.row.id } },
);
</script>

<template>
  <router-link
    :to="to"
    class="inline-flex items-center gap-1 rounded-md border border-text-page/30 bg-white px-3 py-1.5 text-xs font-medium text-text-page shadow-sm transition-colors hover:bg-text-page hover:text-white"
  >
    Ver detalle
  </router-link>
</template>
