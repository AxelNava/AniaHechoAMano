<script setup lang="ts">
import { computed } from "vue";
import type { PedidoHistorialListItemDto } from "@/types/orders/orderHistoryDto";
import { getClienteNombre } from "@/utils/orderDisplay";

const props = defineProps<{
  row: PedidoHistorialListItemDto;
  value: unknown;
}>();

const cliente = computed(() => getClienteNombre(props.row));
</script>

<template>
  <span class="font-medium text-text-page">{{ cliente }}</span>
</template>
