<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { ProductApi } from "@/services/products/productApi";
import {
  ProductHistoryApi,
} from "@/services/history/productHistoryApi";
import type { PedidoHistorialListItemDto } from "@/types/orders/orderHistoryDto";

const route = useRoute();
const loading = ref(true);
const error = ref("");
const productApi = new ProductApi();
const productHistoryApi = new ProductHistoryApi();

interface Componente {
  id: number;
  nombre: string;
  cantidad: number;
  unidad_medida: string;
  costo_unitario_congelado: number | null;
  [key: string]: unknown;
}

interface ProductoPedido {
  id: number;
  descripcion_cliente: string;
  precio_estimado_ia: number | null;
  precio_fijado_admin: number | null;
  tiempo_total_estimado_minutos: number | null;
  foto_referencia_url: string | null;
  componentes: Componente[];
}

interface Pedido extends Omit<PedidoHistorialListItemDto, "productos"> {
  productos: ProductoPedido[];
}

interface Product {
  id: number;
  nombre: string;
  descripcion?: string;
  precio_base: number;
  activo?: boolean;
  categoria_id: number;
}

const product = ref<Product | null>(null);
const pedidos = ref<Pedido[]>([]);

const productId = computed(() => Number(route.params.id));

const fetchProductAndOrders = async () => {
  loading.value = true;
  error.value = "";
  try {
    product.value = await productApi.getProductById(productId.value);
    if (!product.value) {
      throw new Error("Producto no encontrado");
    }
    const historyResponse = await productHistoryApi.getOrdersByProduct(productId.value, {
      page: 1,
      limit: 50,
      sort: "fecha_solicitud_desc",
    });
    pedidos.value = historyResponse.data;
  } catch (_) {
    error.value = "Error al cargar los datos";
  } finally {
    loading.value = false;
  }
};

const getEstadoColor = (estado: string) => {
  const colors: Record<string, string> = {
    COTIZANDO: "bg-yellow-100 text-yellow-800",
    ESPERANDO_ANTICIPO: "bg-orange-100 text-orange-800",
    CONFIRMADO: "bg-blue-100 text-blue-800",
    EN_PROCESO: "bg-purple-100 text-purple-800",
    TERMINADO: "bg-green-100 text-green-800",
    ENTREGADO: "bg-emerald-100 text-emerald-800",
    CANCELADO: "bg-red-100 text-red-800",
  };
  return colors[estado] || "bg-gray-100 text-gray-800";
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    Number(amount),
  );
};

onMounted(fetchProductAndOrders);
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <div v-if="loading" class="text-center py-12 text-gray-500">Cargando historial...</div>

    <div v-else-if="error" class="p-4 bg-red-100 text-red-700 rounded-md">
      {{ error }}
    </div>

    <div v-else>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Historial de Pedidos</h1>
        <p class="text-gray-600 mt-1">
          Producto: <span class="font-semibold">{{ product?.nombre }}</span>
        </p>
      </div>

      <div
        v-if="pedidos.length === 0"
        class="bg-white rounded-lg shadow p-8 text-center text-gray-500"
      >
        No hay pedidos para este producto
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="pedido in pedidos"
          :key="pedido.id"
          class="bg-white rounded-lg shadow overflow-hidden"
        >
          <div class="bg-gray-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-4">
              <span class="font-mono text-sm">Pedido #{{ pedido.id }}</span>
              <span
                :class="[
                  'px-2 py-1 rounded-full text-xs font-medium',
                  getEstadoColor(pedido.estado),
                ]"
              >
                {{ pedido.estado }}
              </span>
            </div>
            <span class="text-sm text-gray-500">{{ formatDate(pedido.fecha_solicitud) }}</span>
          </div>

          <div class="p-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p class="text-xs text-gray-500 uppercase">Cliente</p>
                <p class="font-medium">
                  {{ pedido.cliente?.nombre || `Cliente #${pedido.cliente_id}` }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 uppercase">Fecha Entrega</p>
                <p class="font-medium">{{ formatDate(pedido.fecha_entrega_acordada) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 uppercase">Precio Final</p>
                <p class="font-medium text-green-600">
                  {{ formatCurrency(pedido.precio_final_total) }}
                </p>
              </div>
            </div>

            <div v-if="pedido.productos?.length" class="border-t pt-4">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Productos del Pedido</h3>
              <div class="space-y-3">
                <div
                  v-for="productoPedido in pedido.productos"
                  :key="productoPedido.id"
                  class="bg-gray-50 rounded p-3"
                >
                  <div class="flex flex-wrap gap-4">
                    <div class="flex-1 min-w-[200px]">
                      <p class="text-xs text-gray-500">Descripción del Cliente</p>
                      <p class="text-sm">{{ productoPedido.descripcion_cliente }}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-xs text-gray-500">Precio Fijado</p>
                      <p class="text-sm font-medium">
                        {{ formatCurrency(productoPedido.precio_fijado_admin) }}
                      </p>
                    </div>
                    <div v-if="productoPedido.foto_referencia_url" class="w-20 h-20">
                      <p class="text-xs text-gray-500 mb-1">Foto</p>
                      <img
                        :src="productoPedido.foto_referencia_url"
                        class="w-full h-full object-cover rounded"
                        alt="Referencia"
                      />
                    </div>
                  </div>

                  <div
                    v-if="productoPedido.componentes?.length"
                    class="mt-3 pl-3 border-l-2 border-gray-200"
                  >
                    <p class="text-xs text-gray-500 mb-2">Componentes utilizados:</p>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div
                        v-for="comp in productoPedido.componentes"
                        :key="comp.id"
                        class="bg-white rounded p-2 text-xs"
                      >
                        <p class="font-medium">{{ comp.nombre }}</p>
                        <p class="text-gray-500">
                          Cantidad: {{ comp.cantidad }} {{ comp.unidad_medida }}
                        </p>
                        <p class="text-gray-500">
                          Costo: {{ formatCurrency(comp.costo_unitario_congelado) }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="pedido.notas_admin" class="mt-4 border-t pt-3">
              <p class="text-xs text-gray-500">Notas del Administrador</p>
              <p class="text-sm">{{ pedido.notas_admin }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
