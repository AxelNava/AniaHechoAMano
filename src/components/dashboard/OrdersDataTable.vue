<script setup lang="ts">
import { computed } from "vue";
import { DataTable, DataTableColumn } from "@/components/ui";
import OrderPedidoCell from "@/components/dashboard/order-table-cells/OrderPedidoCell.vue";
import OrderClienteCell from "@/components/dashboard/order-table-cells/OrderClienteCell.vue";
import OrderCategoriaCell from "@/components/dashboard/order-table-cells/OrderCategoriaCell.vue";
import OrderEntregaCell from "@/components/dashboard/order-table-cells/OrderEntregaCell.vue";
import OrderPrecioCell from "@/components/dashboard/order-table-cells/OrderPrecioCell.vue";
import OrderEstadoCell from "@/components/dashboard/order-table-cells/OrderEstadoCell.vue";
import OrderDetalleCell from "@/components/dashboard/order-table-cells/OrderDetalleCell.vue";
import type { PedidoHistorialListItemDto } from "@/types/orders/orderHistoryDto";

const props = withDefaults(
  defineProps<{
    rows: PedidoHistorialListItemDto[];
    emptyMessage?: string;
  }>(),
  {
    emptyMessage: "No hay pedidos",
  },
);

defineSlots<{
  toolbar?: () => unknown;
}>();

// DataTable exige `TRow extends Record<string, unknown>`; las interfaces no
// cumplen ese constraint, así que intersectamos para satisfacerlo.
type OrderRow = PedidoHistorialListItemDto & Record<string, unknown>;
const rows = computed(() => props.rows as OrderRow[]);
</script>

<template>
  <DataTable :rows="rows" :row-key="(row) => row.id" :empty-message="emptyMessage">
    <template v-if="$slots.toolbar" #toolbar>
      <slot name="toolbar" />
    </template>

    <DataTableColumn label="Pedido" :accessor="(row) => row.id" :cell-component="OrderPedidoCell" />
    <DataTableColumn label="Cliente" prop="cliente_nombre" :cell-component="OrderClienteCell" />
    <DataTableColumn label="Categoría" prop="categoria" :cell-component="OrderCategoriaCell" />
    <DataTableColumn label="Entrega" prop="fecha_entrega_acordada" :cell-component="OrderEntregaCell" />
    <DataTableColumn
      label="Precio"
      prop="precio_final_total"
      header-class="text-right"
      cell-class="text-right"
      :cell-component="OrderPrecioCell"
    />
    <DataTableColumn label="Estado" prop="estado" :cell-component="OrderEstadoCell" />
    <DataTableColumn
      label="Detalle"
      :accessor="(row) => row.id"
      header-class="text-right"
      cell-class="text-right"
      :cell-component="OrderDetalleCell"
    />
  </DataTable>
</template>
