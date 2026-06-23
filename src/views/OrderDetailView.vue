<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, type RouteLocationRaw } from "vue-router";
import { Calendar } from "lucide-vue-next";
import { ProductApi, resolveProductImageUrl } from "@/services/products/productApi";
import { ProductHistoryApi } from "@/services/history/productHistoryApi";
import type { PedidoDetalleDto } from "@/types/orders/orderHistoryDto";
import type { ProductDto } from "@/types/products/ProductDto";
import {
  formatCurrency,
  formatDate,
  formatDateLong,
  getClienteNombre,
  getEntregaTexto,
  getEstadoColor,
  getEstadoLabel,
} from "@/utils/orderDisplay";

const route = useRoute();
const loading = ref(true);
const error = ref("");
const productHistoryApi = new ProductHistoryApi();
const productApi = new ProductApi();

const pedido = ref<PedidoDetalleDto | null>(null);
const product = ref<ProductDto | null>(null);

const productId = computed(() => Number(route.params.id));
const pedidoId = computed(() => Number(route.params.pedidoId));
// La vista se usa desde el flujo de un producto (`/products/:id/orders/:pedidoId`)
// y desde el historial global (`/orders/:pedidoId`, sin productId).
const hasProductId = computed(() => !Number.isNaN(productId.value));

const backLink = computed<RouteLocationRaw>(() =>
  hasProductId.value
    ? { name: "admin-product-orders", params: { id: productId.value } }
    : { name: "admin-orders" },
);

const fetchPedido = async () => {
  loading.value = true;
  error.value = "";
  try {
    const [pedidoData, productData] = await Promise.all([
      productHistoryApi.getOrderById(pedidoId.value),
      hasProductId.value
        ? productApi.getProductById(productId.value).catch(() => null)
        : Promise.resolve(null),
    ]);
    pedido.value = pedidoData;
    product.value = productData;
    if (!pedido.value) {
      error.value = "Pedido no encontrado";
    }
  } catch (_) {
    error.value = "Error al cargar el pedido";
  } finally {
    loading.value = false;
  }
};

// Título: nombre del pedido y, si no tiene, el nombre del producto como respaldo.
const tituloPedido = computed(() => {
  if (!pedido.value) return "";
  return pedido.value.nombre?.trim() || product.value?.nombre || `Pedido #${pedido.value.id}`;
});

const entregaTexto = computed(() =>
  pedido.value ? getEntregaTexto(pedido.value.fecha_entrega_acordada) : "",
);

onMounted(fetchPedido);
</script>

<template>
  <div class="max-w-5xl mx-auto p-6">
    <router-link
      :to="backLink"
      class="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
    >
      ← Volver al historial
    </router-link>

    <div v-if="loading" class="text-center py-12 text-gray-500">Cargando pedido...</div>

    <div v-else-if="error" class="p-4 bg-red-100 text-red-700 rounded-md">
      {{ error }}
    </div>

    <div v-else-if="pedido" class="space-y-6">
      <div class="bg-white rounded-lg shadow ring-1 ring-gray-200 overflow-hidden">
        <div class="bg-gray-50 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="text-xl font-bold text-gray-800">
              {{ tituloPedido }}
              <small class="ml-1 text-sm font-normal text-gray-400">#{{ pedido.id }}</small>
            </h1>
            <span
              :class="[
                'px-2.5 py-1 rounded-full text-xs font-medium',
                getEstadoColor(pedido.estado),
              ]"
            >
              {{ getEstadoLabel(pedido.estado) }}
            </span>
          </div>
          <span class="text-sm text-gray-500">
            Solicitado: {{ formatDate(pedido.fecha_solicitud) }}
          </span>
        </div>

        <div class="p-6 space-y-6">
          <!-- Fecha de entrega resaltada -->
          <div
            class="flex items-center gap-4 rounded-lg border border-blue-200 bg-blue-50 px-5 py-4"
          >
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Calendar class="h-6 w-6 text-blue-700" />
            </div>
            <div class="min-w-0">
              <p class="text-xs uppercase tracking-wide text-blue-700/80">Fecha de entrega</p>
              <p class="text-lg font-bold capitalize text-blue-900 leading-tight">
                {{ formatDateLong(pedido.fecha_entrega_acordada) }}
              </p>
            </div>
            <span
              v-if="entregaTexto"
              class="ml-auto shrink-0 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
            >
              {{ entregaTexto }}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p class="text-xs text-gray-500 uppercase">Cliente</p>
              <p class="font-medium">{{ getClienteNombre(pedido) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 uppercase">Precio Final</p>
              <p class="font-medium text-green-600">
                {{ formatCurrency(pedido.precio_final_total) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-500 uppercase">Anticipo Pagado</p>
              <p class="font-medium">{{ formatCurrency(pedido.anticipo_pagado) }}</p>
            </div>
          </div>

          <div v-if="pedido.notas_admin" class="border-t pt-4">
            <p class="text-xs text-gray-500 uppercase">Notas del Administrador</p>
            <p class="text-sm">{{ pedido.notas_admin }}</p>
          </div>
        </div>
      </div>

      <div v-if="pedido.productos?.length" class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-800">Productos del Pedido</h2>
        <div
          v-for="productoPedido in pedido.productos"
          :key="productoPedido.id"
          class="bg-white rounded-lg shadow ring-1 ring-gray-200 p-4"
        >
          <div class="flex flex-wrap gap-4">
            <div
              v-if="productoPedido.foto_referencia_url"
              class="h-24 w-24 shrink-0 overflow-hidden rounded-md ring-1 ring-gray-200"
            >
              <img
                :src="resolveProductImageUrl(productoPedido.foto_referencia_url)"
                class="h-full w-full object-cover"
                alt="Referencia del pedido"
              />
            </div>
            <div class="flex-1 min-w-50">
              <p class="text-xs text-gray-500 uppercase">Descripción del Cliente</p>
              <p class="text-sm">{{ productoPedido.descripcion_cliente }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-500 uppercase">Precio Fijado</p>
              <p class="text-sm font-medium">
                {{ formatCurrency(productoPedido.precio_fijado_admin) }}
              </p>
              <p v-if="productoPedido.tiempo_total_estimado_minutos" class="mt-2 text-xs text-gray-500">
                {{ productoPedido.tiempo_total_estimado_minutos }} min estimados
              </p>
            </div>
          </div>

          <div
            v-if="productoPedido.componentes?.length"
            class="mt-4 pt-4 border-t border-gray-100"
          >
            <p class="text-xs text-gray-500 uppercase mb-2">Componentes utilizados</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div
                v-for="comp in productoPedido.componentes"
                :key="comp.id"
                class="rounded-md bg-gray-50 ring-1 ring-gray-200 p-2 text-xs"
              >
                <p class="font-medium text-gray-800">{{ comp.nombre }}</p>
                <p class="text-gray-500">Cantidad: {{ comp.cantidad }} {{ comp.unidad_medida }}</p>
                <p class="text-gray-500">
                  Costo: {{ formatCurrency(comp.costo_unitario_congelado) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
