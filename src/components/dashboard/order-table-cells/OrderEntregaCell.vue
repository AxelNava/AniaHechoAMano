<script setup lang="ts">
import { computed } from "vue";
import { Calendar } from "lucide-vue-next";
import type { PedidoHistorialListItemDto } from "@/types/orders/orderHistoryDto";
import { formatDate, getEntregaTexto } from "@/utils/orderDisplay";

const props = defineProps<{
  row: PedidoHistorialListItemDto;
  value: unknown;
}>();

const fecha = computed(() => props.row.fecha_entrega_acordada);
</script>

<template>
  <div class="inline-flex flex-col items-start gap-1">
    <span
      class="inline-flex items-center gap-1.5 rounded-md bg-primary/60 px-2.5 py-1 text-sm font-semibold text-text-page"
    >
      <Calendar class="h-3.5 w-3.5" />
      {{ formatDate(fecha) }}
    </span>
    <span class="text-xs text-text-page2">{{ getEntregaTexto(fecha) }}</span>
  </div>
</template>
