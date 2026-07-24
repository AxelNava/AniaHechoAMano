<script setup lang="ts">
import { usePedidoCliente } from "@/composables/pedido/usePedidoCliente";
import { formatCurrency, formatDiaISO } from "@/utils/orderDisplay";

// Paso "Resumen de precio". Solo aparece en pedidos 100% fijos (si hay una
// modificación, el wizard lo oculta porque el precio se cotiza después).
const { lineas, precioTotalSugerido, fechaSolicitada, requiereAnticipo } = usePedidoCliente();
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-text-page text-lg font-semibold">Resumen del pedido</h2>
      <p class="text-text-page2 text-sm">
        Este es el precio estimado. Lo confirmamos al aceptar tu solicitud.
      </p>
    </div>

    <ul class="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
      <li
        v-for="linea in lineas"
        :key="linea.uid"
        class="flex items-center justify-between gap-4 px-4 py-3"
      >
        <span class="text-text-page min-w-0 truncate font-medium">{{ linea.info.nombre }}</span>
        <span class="text-text-page shrink-0">{{ formatCurrency(linea.info.precio_base) }}</span>
      </li>
    </ul>

    <div class="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
      <span class="text-text-page font-semibold">Total estimado</span>
      <span class="text-text-page text-lg font-bold">{{ formatCurrency(precioTotalSugerido) }}</span>
    </div>

    <div class="text-text-page2 space-y-1 text-sm">
      <p v-if="fechaSolicitada">
        Fecha solicitada:
        <span class="text-text-page font-medium capitalize">{{ formatDiaISO(fechaSolicitada) }}</span>
      </p>
      <p v-if="requiereAnticipo" class="text-amber-600">
        Este pedido requiere anticipo. Te indicaremos el monto al confirmarlo.
      </p>
    </div>
  </div>
</template>
