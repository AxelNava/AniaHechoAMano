<script setup lang="ts">
import { computed } from "vue";
import type { PedidoHistorialListItemDto } from "@/types/orders/orderHistoryDto";
import { getPedidoEsTemplate, getPedidoImagenUrl } from "@/utils/orderDisplay";

const props = defineProps<{
  row: PedidoHistorialListItemDto;
  value: unknown;
}>();

const imagen = computed(() => getPedidoImagenUrl(props.row));
const esTemplate = computed(() => getPedidoEsTemplate(props.row));
const nombre = computed(() => props.row.nombre?.trim() || "Pedido");
</script>

<template>
  <div class="flex items-center gap-3">
    <div
      class="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-primary/40 ring-1 ring-secondary"
    >
      <img
        v-if="imagen"
        :src="imagen"
        :alt="`Pedido #${row.id}`"
        class="h-full w-full object-cover"
        loading="lazy"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center text-[10px] text-text-page2"
      >
        Sin imagen
      </div>
      <span
        v-if="esTemplate"
        class="absolute bottom-0 inset-x-0 bg-text-page/70 px-1 py-0.5 text-center text-[9px] text-white"
        title="Imagen de referencia del producto (no del pedido)"
      >
        Template
      </span>
    </div>
    <div class="min-w-0">
      <p class="font-semibold text-text-page truncate">{{ nombre }}</p>
      <span class="font-mono text-xs text-text-page2">#{{ row.id }}</span>
    </div>
  </div>
</template>
