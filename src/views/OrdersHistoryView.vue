<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { OrdersApi } from "@/services/orders/ordersApi";
import OrdersDataTable from "@/components/dashboard/OrdersDataTable.vue";
import HistoryErrorState from "@/components/dashboard/HistoryErrorState.vue";
import type { PedidoHistorialListItemDto } from "@/types/orders/orderHistoryDto";
import { getMonthKey, getMonthLabel } from "@/utils/orderDisplay";

const ordersApi = new OrdersApi();

const loading = ref(true);
const refreshing = ref(false);
const error = ref("");
const pedidos = ref<PedidoHistorialListItemDto[]>([]);

const loadData = async () => {
  const response = await ordersApi.getAllOrders({ page: 1, limit: 200 });
  pedidos.value = response.data;
};

const fetchPedidos = async () => {
  loading.value = true;
  error.value = "";
  try {
    await loadData();
  } catch (_) {
    error.value = "Error al cargar los pedidos";
  } finally {
    loading.value = false;
  }
};

const refreshTable = async () => {
  refreshing.value = true;
  error.value = "";
  try {
    await loadData();
  } catch (_) {
    error.value = "Error al cargar los pedidos";
  } finally {
    refreshing.value = false;
  }
};

// Los pedidos llegan ordenados por fecha de entrega (desc) desde el backend,
// así que el Map preserva el orden y agrupa por mes de mayor a menor.
const gruposPorMes = computed(() => {
  const grupos = new Map<
    string,
    { key: string; label: string; pedidos: PedidoHistorialListItemDto[] }
  >();
  for (const pedido of pedidos.value) {
    // Los pedidos sin fecha de entrega acordada (COTIZANDO /
    // PENDIENTE_CONFIRMACION) se agrupan aparte.
    const fecha = pedido.fecha_entrega_acordada;
    const key = fecha ? getMonthKey(fecha) : "sin-fecha";
    if (!grupos.has(key)) {
      grupos.set(key, {
        key,
        label: fecha ? getMonthLabel(fecha) : "Sin fecha de entrega",
        pedidos: [],
      });
    }
    grupos.get(key)!.pedidos.push(pedido);
  }
  return [...grupos.values()];
});

onMounted(fetchPedidos);
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-text-page">Historial de Pedidos</h1>
      <button
        v-if="!error"
        type="button"
        :disabled="refreshing || loading"
        @click="refreshTable"
        class="inline-flex items-center rounded-md border border-text-page/30 bg-white px-3 py-2 text-sm font-medium text-text-page transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ refreshing ? "Actualizando..." : "Actualizar" }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-12 text-text-page2">Cargando historial...</div>

    <HistoryErrorState
      v-else-if="error"
      :message="error"
      :retrying="refreshing"
      @retry="refreshTable"
    />

    <div
      v-else-if="pedidos.length === 0"
      class="bg-white rounded-lg shadow ring-1 ring-secondary p-8 text-center text-text-page2"
    >
      No hay pedidos registrados todavía
    </div>

    <div v-else class="space-y-8">
      <section v-for="grupo in gruposPorMes" :key="grupo.key">
        <div
          class="mb-3 flex items-center gap-3 border-l-4 border-text-page bg-primary/30 px-4 py-2 rounded-r-md"
        >
          <h2 class="text-lg font-bold capitalize text-text-page">{{ grupo.label }}</h2>
          <span class="text-sm text-text-page2">
            {{ grupo.pedidos.length }} {{ grupo.pedidos.length === 1 ? "pedido" : "pedidos" }}
          </span>
        </div>

        <div class="bg-white rounded-lg shadow ring-1 ring-secondary overflow-hidden">
          <OrdersDataTable :rows="grupo.pedidos" />
        </div>
      </section>
    </div>
  </div>
</template>
