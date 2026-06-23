<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { ProductApi } from "@/services/products/productApi";
import { ProductHistoryApi } from "@/services/history/productHistoryApi";
import OrdersDataTable from "@/components/dashboard/OrdersDataTable.vue";
import HistoryErrorState from "@/components/dashboard/HistoryErrorState.vue";
import type { PedidoHistorialListItemDto } from "@/types/orders/orderHistoryDto";
import type { ProductDto } from "@/types/products/ProductDto";

const route = useRoute();
const loading = ref(true);
const refreshing = ref(false);
const error = ref("");
const productApi = new ProductApi();
const productHistoryApi = new ProductHistoryApi();

const product = ref<ProductDto | null>(null);
const pedidos = ref<PedidoHistorialListItemDto[]>([]);

const productId = computed(() => Number(route.params.id));

const loadData = async () => {
  product.value = await productApi.getProductById(productId.value);
  if (!product.value) {
    error.value = "Producto no encontrado";
    return;
  }

  const historyResponse = await productHistoryApi.getOrdersByProduct(productId.value, {
    page: 1,
    limit: 50,
    sort: "fecha_solicitud_desc",
  });
  pedidos.value = historyResponse.data;
};

const fetchProductAndOrders = async () => {
  loading.value = true;
  error.value = "";
  try {
    await loadData();
  } catch (_) {
    error.value = "Error al cargar los datos";
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
    error.value = "Error al cargar los datos";
  } finally {
    refreshing.value = false;
  }
};

onMounted(fetchProductAndOrders);
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <div v-if="loading" class="text-center py-12 text-text-page2">Cargando historial...</div>

    <HistoryErrorState
      v-else-if="error"
      :message="error"
      :retrying="refreshing"
      @retry="refreshTable"
    />

    <div v-else>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-text-page">Historial de Pedidos</h1>
        <p class="text-text-page2 mt-1">
          Producto: <span class="font-semibold text-text-page">{{ product?.nombre }}</span>
        </p>
      </div>

      <div class="bg-white rounded-lg shadow ring-1 ring-secondary overflow-hidden">
        <OrdersDataTable :rows="pedidos" empty-message="No hay pedidos para este producto">
          <template #toolbar>
            <button
              type="button"
              :disabled="refreshing"
              @click="refreshTable"
              class="inline-flex items-center rounded-md border border-text-page/30 bg-white px-3 py-2 text-sm font-medium text-text-page transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ refreshing ? "Actualizando..." : "Actualizar" }}
            </button>
          </template>
        </OrdersDataTable>
      </div>
    </div>
  </div>
</template>
