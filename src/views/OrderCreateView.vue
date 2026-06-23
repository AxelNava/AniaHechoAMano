<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { ProductApi } from "@/services/products/productApi";
import { ClientesApi } from "@/services/clientes/clientesApi";
import { OrdersApi } from "@/services/orders/ordersApi";
import { useOrderForm } from "@/composables/orders/useOrderForm";
import { useLoadingButton } from "@/composables/useLoadingButton";
import { LoadingButton } from "@/components/ui/loading-button";
import type { ClienteListItemDto, CreateOrderDto } from "@/types/orders/createOrderDto";
import type { ProductDto } from "@/types/products/ProductDto";

const route = useRoute();
const router = useRouter();
const productId = computed(() => Number(route.params.id));

const productApi = new ProductApi();
const clientesApi = new ClientesApi();
const ordersApi = new OrdersApi();

const {
  productos,
  addCatalogItem,
  addCustomItem,
  removeItem,
  duplicateItem,
  precioTotalSugerido,
  buildProductosPayload,
} = useOrderForm();

const { status, message, execute } = useLoadingButton({ successDuration: 3000 });

const loadingInicial = ref(true);
const errorInicial = ref("");
const validationError = ref("");

const ESTADOS = [
  "COTIZANDO",
  "ESPERANDO_ANTICIPO",
  "CONFIRMADO",
  "EN_PROCESO",
  "TERMINADO",
  "ENTREGADO",
  "CANCELADO",
];

// Cliente
const clienteModo = ref<"buscar" | "nuevo">("buscar");
const clienteSearch = ref("");
const clienteResultados = ref<ClienteListItemDto[]>([]);
const clienteSeleccionado = ref<ClienteListItemDto | null>(null);
const buscandoCliente = ref(false);
const clienteNuevo = ref({ nombre: "", telefono: "", red_social_contacto: "", notas: "" });

let clienteSearchTimeout: ReturnType<typeof setTimeout> | null = null;
watch(clienteSearch, (value) => {
  if (clienteSeleccionado.value) return;
  if (clienteSearchTimeout) clearTimeout(clienteSearchTimeout);
  clienteSearchTimeout = setTimeout(async () => {
    buscandoCliente.value = true;
    try {
      clienteResultados.value = await clientesApi.searchClientes(value);
    } finally {
      buscandoCliente.value = false;
    }
  }, 300);
});

const seleccionarCliente = (cliente: ClienteListItemDto) => {
  clienteSeleccionado.value = cliente;
  clienteResultados.value = [];
};

const limpiarClienteSeleccionado = () => {
  clienteSeleccionado.value = null;
  clienteSearch.value = "";
};

const cambiarModoCliente = (modo: "buscar" | "nuevo") => {
  clienteModo.value = modo;
  clienteSeleccionado.value = null;
  clienteResultados.value = [];
  clienteSearch.value = "";
};

// Datos del pedido
const nombrePedido = ref("");
const nombreEditadoManualmente = ref(false);
const fechaEntrega = ref("");
const estado = ref("CONFIRMADO");
const anticipoPagado = ref(0);
const notasAdmin = ref("");
const precioFinalManual = ref<number | null>(null);

// Nombre por defecto: "<primer producto> - <primera palabra del cliente>"
// (p. ej. "Piñata - Rios"). Se mantiene sincronizado hasta que el admin lo edita.
const clienteNombreActual = computed(() =>
  clienteModo.value === "buscar"
    ? (clienteSeleccionado.value?.nombre ?? "")
    : clienteNuevo.value.nombre,
);

const nombrePedidoSugerido = computed(() => {
  const producto = productos.value[0]?.nombre?.trim() ?? "";
  const cliente = clienteNombreActual.value.trim().split(/\s+/)[0] ?? "";
  if (!producto && !cliente) return "";
  if (!cliente) return producto;
  if (!producto) return cliente;
  return `${producto} - ${cliente}`;
});

watch(
  nombrePedidoSugerido,
  (sugerido) => {
    if (!nombreEditadoManualmente.value) nombrePedido.value = sugerido;
  },
  { immediate: true },
);

const onNombrePedidoInput = () => {
  nombreEditadoManualmente.value = nombrePedido.value.trim().length > 0;
};

// Agregar más productos del catálogo
const showCatalogSearch = ref(false);
const catalogSearch = ref("");
const catalogResultados = ref<ProductDto[]>([]);
const buscandoCatalogo = ref(false);
const agregandoProducto = ref(false);

let catalogSearchTimeout: ReturnType<typeof setTimeout> | null = null;
watch(catalogSearch, (value) => {
  if (!showCatalogSearch.value) return;
  if (catalogSearchTimeout) clearTimeout(catalogSearchTimeout);
  catalogSearchTimeout = setTimeout(async () => {
    buscandoCatalogo.value = true;
    try {
      const response = await productApi.getProductsPaginated({ search: value, limit: 10 });
      catalogResultados.value = response.data;
    } finally {
      buscandoCatalogo.value = false;
    }
  }, 300);
});

const abrirBuscadorCatalogo = async () => {
  showCatalogSearch.value = true;
  catalogSearch.value = "";
  buscandoCatalogo.value = true;
  try {
    const response = await productApi.getProductsPaginated({ limit: 10 });
    catalogResultados.value = response.data;
  } finally {
    buscandoCatalogo.value = false;
  }
};

const seleccionarProductoCatalogo = async (producto: ProductDto) => {
  agregandoProducto.value = true;
  try {
    const info = await productApi.getProductOrderInfo(producto.id);
    if (info) {
      addCatalogItem(info);
      toast.success(`"${info.nombre}" agregado al pedido`);
      showCatalogSearch.value = false;
    } else {
      toast.error("No se pudo cargar la información del producto");
    }
  } finally {
    agregandoProducto.value = false;
  }
};

const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
};

const cargarProductoInicial = async () => {
  loadingInicial.value = true;
  errorInicial.value = "";
  try {
    const info = await productApi.getProductOrderInfo(productId.value);
    if (!info) {
      errorInicial.value = "No se pudo cargar la información de este producto.";
      return;
    }
    addCatalogItem(info);
  } catch (_) {
    errorInicial.value = "Error al cargar la información del producto.";
  } finally {
    loadingInicial.value = false;
  }
};

const submitOrder = async () => {
  validationError.value = "";

  const tieneClienteNuevo = clienteModo.value === "nuevo" && clienteNuevo.value.nombre.trim();
  const tieneClienteExistente = clienteModo.value === "buscar" && clienteSeleccionado.value;

  if (!tieneClienteNuevo && !tieneClienteExistente) {
    validationError.value =
      "Selecciona un cliente existente o captura los datos de un cliente nuevo.";
    return;
  }
  if (!fechaEntrega.value) {
    validationError.value = "La fecha de entrega acordada es obligatoria.";
    return;
  }
  if (productos.value.length === 0) {
    validationError.value = "Agrega al menos un producto al pedido.";
    return;
  }
  if (productos.value.some((item) => !item.descripcion_cliente.trim())) {
    validationError.value = "Todos los productos deben tener una descripción.";
    return;
  }

  await execute(async () => {
    const payload: CreateOrderDto = {
      nombre: nombrePedido.value.trim() || nombrePedidoSugerido.value || undefined,
      fecha_entrega_acordada: fechaEntrega.value,
      estado: estado.value,
      anticipo_pagado: anticipoPagado.value || 0,
      notas_admin: notasAdmin.value.trim() || undefined,
      precio_final_total:
        typeof precioFinalManual.value === "number" ? precioFinalManual.value : undefined,
      productos: buildProductosPayload(),
    };

    if (tieneClienteExistente && clienteSeleccionado.value) {
      payload.cliente_id = clienteSeleccionado.value.id;
    } else {
      payload.cliente_nuevo = {
        nombre: clienteNuevo.value.nombre.trim(),
        telefono: clienteNuevo.value.telefono.trim() || undefined,
        red_social_contacto: clienteNuevo.value.red_social_contacto.trim() || undefined,
        notas: clienteNuevo.value.notas.trim() || undefined,
      };
    }

    await ordersApi.createOrder(payload);

    toast.success("Pedido registrado exitosamente", {
      style: { background: "#111827", color: "#ffffff", border: "1px solid #374151" },
    });

    router.push(`/admin/products/${productId.value}/orders`);
  });
};

onMounted(cargarProductoInicial);
</script>

<template>
  <div class="mx-auto mt-10 max-w-5xl p-6">
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Registrar pedido</h1>

    <div v-if="loadingInicial" class="text-center py-8 text-gray-500">
      Cargando información del producto...
    </div>

    <div v-else>
      <div
        v-if="errorInicial"
        class="mb-6 p-3 bg-yellow-100 text-yellow-800 rounded-md text-sm border border-yellow-200"
      >
        {{ errorInicial }} Puedes seguir y agregar productos manualmente.
      </div>

      <form @submit.prevent novalidate class="space-y-6">
        <!-- Cliente -->
        <section class="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 class="font-semibold text-gray-700">Cliente</h2>

          <div class="flex gap-2 text-sm">
            <button
              type="button"
              @click="cambiarModoCliente('buscar')"
              :class="[
                'px-3 py-1 rounded-md font-medium cursor-pointer',
                clienteModo === 'buscar'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600',
              ]"
            >
              Buscar cliente existente
            </button>
            <button
              type="button"
              @click="cambiarModoCliente('nuevo')"
              :class="[
                'px-3 py-1 rounded-md font-medium cursor-pointer',
                clienteModo === 'nuevo'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600',
              ]"
            >
              Cliente nuevo
            </button>
          </div>

          <div v-if="clienteModo === 'buscar'">
            <div
              v-if="clienteSeleccionado"
              class="flex items-center justify-between bg-green-50 border border-green-200 rounded-md p-3"
            >
              <div>
                <p class="font-medium text-gray-800">{{ clienteSeleccionado.nombre }}</p>
                <p class="text-sm text-gray-500">
                  {{ clienteSeleccionado.telefono || "Sin teléfono" }}
                </p>
              </div>
              <button
                type="button"
                @click="limpiarClienteSeleccionado"
                class="text-sm text-red-600 hover:text-red-800 cursor-pointer"
              >
                Cambiar
              </button>
            </div>
            <div v-else>
              <input
                v-model="clienteSearch"
                placeholder="Buscar por nombre o teléfono..."
                class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <div v-if="buscandoCliente" class="text-sm text-gray-500 mt-2">Buscando...</div>
              <ul
                v-else-if="clienteResultados.length"
                class="mt-2 border rounded-md divide-y max-h-48 overflow-y-auto"
              >
                <li
                  v-for="cliente in clienteResultados"
                  :key="cliente.id"
                  @click="seleccionarCliente(cliente)"
                  class="p-2 hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <p class="font-medium">{{ cliente.nombre }}</p>
                  <p class="text-gray-500">
                    {{ cliente.telefono || cliente.red_social_contacto || "Sin contacto" }}
                  </p>
                </li>
              </ul>
              <p v-else-if="clienteSearch" class="text-sm text-gray-500 mt-2">Sin resultados.</p>
            </div>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                v-model="clienteNuevo.nombre"
                required
                class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                v-model="clienteNuevo.telefono"
                class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Red social</label>
              <input
                v-model="clienteNuevo.red_social_contacto"
                class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input
                v-model="clienteNuevo.notas"
                class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <!-- Datos del pedido -->
        <section class="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 class="font-semibold text-gray-700">Datos del pedido</h2>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del pedido</label>
            <input
              v-model="nombrePedido"
              @input="onNombrePedidoInput"
              type="text"
              placeholder="Ej. Piñata - Rios"
              class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p class="text-xs text-gray-400 mt-1">
              Se genera automáticamente con el producto y el cliente; puedes editarlo.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Fecha de entrega acordada *
              </label>
              <input
                v-model="fechaEntrega"
                type="date"
                required
                class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                v-model="estado"
                class="w-full border border-gray-300 rounded-md p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option v-for="opcion in ESTADOS" :key="opcion" :value="opcion">
                  {{ opcion }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Anticipo pagado</label>
              <input
                v-model.number="anticipoPagado"
                type="number"
                min="0"
                step="0.01"
                class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Precio final total
                <span class="text-gray-400 font-normal">
                  (sugerido: {{ formatCurrency(precioTotalSugerido) }})
                </span>
              </label>
              <input
                v-model.number="precioFinalManual"
                type="number"
                min="0"
                step="0.01"
                :placeholder="String(precioTotalSugerido)"
                class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Notas del administrador
            </label>
            <textarea
              v-model="notasAdmin"
              rows="2"
              class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            ></textarea>
          </div>
        </section>

        <!-- Productos -->
        <section class="bg-white rounded-xl shadow p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-gray-700">Productos del pedido</h2>
            <div class="flex gap-2">
              <button
                type="button"
                @click="abrirBuscadorCatalogo"
                class="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-medium cursor-pointer"
              >
                + Producto del catálogo
              </button>
              <button
                type="button"
                @click="addCustomItem"
                class="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 font-medium cursor-pointer"
              >
                + Producto personalizado
              </button>
            </div>
          </div>

          <div v-if="showCatalogSearch" class="bg-gray-50 border border-gray-200 rounded-md p-3">
            <input
              v-model="catalogSearch"
              placeholder="Buscar producto..."
              autofocus
              class="w-full border border-gray-300 rounded-md p-2 mb-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div v-if="buscandoCatalogo || agregandoProducto" class="text-sm text-gray-500">
              Cargando...
            </div>
            <ul v-else class="divide-y max-h-56 overflow-y-auto">
              <li
                v-for="producto in catalogResultados"
                :key="producto.id"
                @click="seleccionarProductoCatalogo(producto)"
                class="p-2 hover:bg-white cursor-pointer text-sm flex justify-between"
              >
                <span>{{ producto.nombre }}</span>
                <span class="text-gray-500">{{ formatCurrency(producto.precio_base) }}</span>
              </li>
              <li v-if="!catalogResultados.length" class="p-2 text-sm text-gray-500">
                Sin resultados.
              </li>
            </ul>
            <button
              type="button"
              @click="showCatalogSearch = false"
              class="text-sm text-gray-500 mt-2 hover:text-gray-700 cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          <div v-if="productos.length === 0" class="text-sm text-gray-500 italic">
            No hay productos agregados.
          </div>

          <div
            v-for="item in productos"
            :key="item.uid"
            class="border border-gray-200 rounded-lg p-4 space-y-3"
          >
            <div class="flex items-center justify-between">
              <span
                class="text-xs font-medium uppercase px-2 py-1 rounded"
                :class="
                  item.origen === 'catalogo'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-amber-100 text-amber-700'
                "
              >
                {{ item.origen === "catalogo" ? `Catálogo: ${item.nombre}` : "Personalizado" }}
              </span>
              <div class="flex gap-2">
                <button
                  type="button"
                  @click="duplicateItem(item.uid)"
                  class="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Duplicar
                </button>
                <button
                  type="button"
                  @click="removeItem(item.uid)"
                  class="text-xs text-red-600 hover:text-red-800 cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Descripción para el cliente *
              </label>
              <textarea
                v-model="item.descripcion_cliente"
                rows="2"
                required
                class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Precio fijado</label>
                <input
                  v-model.number="item.precio_fijado_admin"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Tiempo estimado (min)
                </label>
                <input
                  v-model.number="item.tiempo_total_estimado_minutos"
                  type="number"
                  min="0"
                  class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div v-if="item.componentes.length" class="bg-gray-50 rounded p-2">
              <p class="text-xs text-gray-500 mb-2">Receta precargada:</p>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div
                  v-for="componente in item.componentes"
                  :key="componente.componente_id"
                  class="bg-white rounded p-2 text-xs"
                >
                  <p class="font-medium">{{ componente.nombre }}</p>
                  <p class="text-gray-500">{{ componente.cantidad }} {{ componente.unidad_medida }}</p>
                  <p class="text-gray-500">
                    {{ formatCurrency(componente.costo_unitario_congelado) }} c/u
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div
          v-if="validationError"
          class="p-3 bg-red-100 text-red-700 rounded-md text-sm border border-red-200"
        >
          {{ validationError }}
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            @click="router.back()"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
          >
            Cancelar
          </button>
          <LoadingButton
            :loading="status === 'loading'"
            :status="status"
            :message="message"
            @click="submitOrder"
          >
            Registrar pedido
          </LoadingButton>
        </div>
      </form>
    </div>
  </div>
</template>
