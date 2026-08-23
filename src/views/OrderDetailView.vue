<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, type RouteLocationRaw } from "vue-router";
import { Calendar, MapPin, ExternalLink } from "lucide-vue-next";
import { ProductApi, resolveProductImageUrl } from "@/services/products/productApi";
import { ProductHistoryApi } from "@/services/history/productHistoryApi";
import { usePedidoAdminAcciones } from "@/composables/orders/usePedidoAdminAcciones";
import { DisponibilidadCalendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PedidoDetalleDto } from "@/types/orders/orderHistoryDto";
import type { ProductDto } from "@/types/products/ProductDto";
import {
  formatCurrency,
  formatDate,
  formatDateLong,
  formatDiaISO,
  getClienteNombre,
  getEntregaPendienteTexto,
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

// Los pedidos sin fecha acordada (COTIZANDO / PENDIENTE_CONFIRMACION) muestran un
// marcador en lugar de la fecha/cuenta regresiva.
const entregaTexto = computed(() => {
  const fecha = pedido.value?.fecha_entrega_acordada;
  return fecha ? getEntregaTexto(fecha) : "";
});

const fechaEntregaTexto = computed(() => {
  if (!pedido.value) return "";
  const fecha = pedido.value.fecha_entrega_acordada;
  return fecha ? formatDateLong(fecha) : getEntregaPendienteTexto(pedido.value.estado);
});

// Fecha que pidió el cliente (solo pedidos fijos por confirmar).
const fechaSolicitadaTexto = computed(() => {
  const fecha = pedido.value?.fecha_entrega_solicitada;
  return fecha ? formatDiaISO(fecha.slice(0, 10)) : "";
});

const entrega = computed(() => pedido.value?.entrega ?? null);

// Línea de dirección legible a partir de los campos de `pedido_entrega`.
const direccionTexto = computed(() => {
  const e = entrega.value;
  if (!e) return "";
  return [e.calle, e.numero_casa, e.municipio].filter(Boolean).join(", ");
});

// Acciones admin (confirmar / cotizar). Refresca el detalle in-situ con lo que
// devuelve el backend, sin un segundo round-trip.
const acciones = usePedidoAdminAcciones(
  () => pedido.value,
  (detalle) => {
    pedido.value = detalle;
  },
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
            <span
              v-if="pedido.retrasado"
              class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-amber-100 text-amber-800 ring-amber-600/20"
            >
              Retrasado
            </span>
            <span
              v-if="pedido.referencia_publica"
              class="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600"
            >
              {{ pedido.referencia_publica }}
            </span>
          </div>
          <span class="text-sm text-gray-500">
            Solicitado: {{ formatDate(pedido.fecha_solicitud) }}
          </span>
        </div>

        <!-- Barra de acciones admin (según el estado del pedido) -->
        <div
          v-if="acciones.puedeConfirmar.value || acciones.puedeCotizar.value"
          class="flex flex-wrap gap-2 border-t border-gray-100 bg-white px-6 py-3"
        >
          <Button v-if="acciones.puedeConfirmar.value" @click="acciones.abrirConfirmar">
            Confirmar pedido
          </Button>
          <Button v-if="acciones.puedeCotizar.value" @click="acciones.abrirCotizar">
            Cotizar pedido
          </Button>
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
                {{ fechaEntregaTexto }}
              </p>
              <p
                v-if="fechaSolicitadaTexto && !pedido.fecha_entrega_acordada"
                class="mt-0.5 text-xs text-blue-700/80"
              >
                Pedida por el cliente:
                <span class="capitalize">{{ fechaSolicitadaTexto }}</span>
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

          <div v-if="entrega" class="border-t pt-4">
            <p class="mb-2 flex items-center gap-1 text-xs uppercase text-gray-500">
              <MapPin class="size-3.5" /> Dirección de entrega
            </p>
            <p v-if="direccionTexto" class="text-sm text-gray-800">{{ direccionTexto }}</p>
            <p v-if="entrega.referencia" class="text-sm text-gray-600">
              Referencia: {{ entrega.referencia }}
            </p>
            <p v-if="entrega.notas" class="text-sm text-gray-600">Notas: {{ entrega.notas }}</p>
            <a
              v-if="entrega.maps_url"
              :href="entrega.maps_url"
              target="_blank"
              rel="noopener"
              class="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink class="size-3.5" /> Ver en Google Maps
            </a>
            <p v-else-if="pedido.maps_url_omitida" class="mt-1 text-xs text-amber-600">
              El cliente no compartió su ubicación de Google Maps.
            </p>
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
              <span
                v-if="productoPedido.es_modificacion"
                class="bg-primary/15 text-primary mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
              >
                Modificación
              </span>
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

          <!-- Fotos de referencia de la modificación subidas por el cliente -->
          <div v-if="productoPedido.imagenes?.length" class="mt-4 flex flex-wrap gap-2">
            <a
              v-for="img in productoPedido.imagenes"
              :key="img.id"
              :href="resolveProductImageUrl(img.url)"
              target="_blank"
              rel="noopener"
              class="block size-20 overflow-hidden rounded-md ring-1 ring-gray-200"
            >
              <img
                :src="resolveProductImageUrl(img.url)"
                :alt="img.alt ?? 'Referencia de la modificación'"
                class="size-full object-cover"
              />
            </a>
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

    <!-- Diálogo: Confirmar pedido fijo (PENDIENTE_CONFIRMACION) -->
    <Dialog
      :open="acciones.dialogo.value === 'confirmar'"
      @update:open="(abierto) => !abierto && acciones.cerrar()"
    >
      <DialogContent class="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmar pedido</DialogTitle>
          <DialogDescription>
            Se re-valida la disponibilidad y el pedido pasa a esperar anticipo o
            queda confirmado.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <p class="text-sm text-gray-600">
            Puedes ajustar la fecha de entrega. Si mantienes la sugerida, se usará la
            fecha que pidió el cliente.
          </p>
          <div class="flex flex-col items-start gap-4 sm:flex-row">
            <DisponibilidadCalendar
              v-model:mes-visible="acciones.disponibilidad.mesVisible.value"
              v-model:fecha-seleccionada="acciones.fechaElegida.value"
              :dias-disponibles="acciones.disponibilidad.diasDisponibles.value"
              :dias-deshabilitados="acciones.disponibilidad.diasDeshabilitados.value"
              :min-fecha="acciones.disponibilidad.minFecha.value"
            />
            <div class="min-w-0 flex-1 text-sm">
              <p v-if="acciones.fechaElegida.value" class="capitalize text-gray-800">
                {{ formatDiaISO(acciones.fechaElegida.value) }}
              </p>
              <p v-else class="text-gray-500">Elige un día disponible.</p>
              <p
                v-if="
                  acciones.disponibilidad.evaluacion.value &&
                  !acciones.disponibilidad.evaluacion.value.disponible
                "
                class="mt-2 text-xs text-red-600"
              >
                Ese día ya no está disponible. Elige otro.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="acciones.guardando.value" @click="acciones.cerrar">
            Cancelar
          </Button>
          <Button :disabled="acciones.guardando.value" @click="acciones.confirmar">
            {{ acciones.guardando.value ? "Confirmando..." : "Confirmar" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Diálogo: Cotizar pedido con modificación (COTIZANDO) -->
    <Dialog
      :open="acciones.dialogo.value === 'cotizar'"
      @update:open="(abierto) => !abierto && acciones.cerrar()"
    >
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cotizar pedido</DialogTitle>
          <DialogDescription>
            Fija el precio (y tiempo opcional) de cada línea y la fecha de entrega.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div
            v-for="linea in acciones.lineasCotizar.value"
            :key="linea.producto_pedido_id"
            class="rounded-md border border-gray-200 p-3"
          >
            <p class="mb-2 text-sm font-medium text-gray-800">{{ linea.descripcion }}</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <Label>Precio</Label>
                <Input v-model.number="linea.precio" type="number" min="0" step="0.01" />
              </div>
              <div class="space-y-1">
                <Label>Minutos estimados</Label>
                <Input v-model.number="linea.tiempo" type="number" min="0" />
              </div>
            </div>
          </div>

          <div>
            <Label class="mb-2 block">Fecha de entrega</Label>
            <div class="flex flex-col items-start gap-4 sm:flex-row">
              <DisponibilidadCalendar
                v-model:mes-visible="acciones.disponibilidad.mesVisible.value"
                v-model:fecha-seleccionada="acciones.fechaElegida.value"
                :dias-disponibles="acciones.disponibilidad.diasDisponibles.value"
                :dias-deshabilitados="acciones.disponibilidad.diasDeshabilitados.value"
                :min-fecha="acciones.disponibilidad.minFecha.value"
              />
              <div class="min-w-0 flex-1 text-sm">
                <p v-if="acciones.fechaElegida.value" class="capitalize text-gray-800">
                  {{ formatDiaISO(acciones.fechaElegida.value) }}
                </p>
                <p v-else class="text-gray-500">Elige un día disponible.</p>
                <p
                  v-if="
                    acciones.disponibilidad.evaluacion.value &&
                    !acciones.disponibilidad.evaluacion.value.disponible
                  "
                  class="mt-2 text-xs text-red-600"
                >
                  Ese día ya no está disponible. Elige otro.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="acciones.guardando.value" @click="acciones.cerrar">
            Cancelar
          </Button>
          <Button :disabled="acciones.guardando.value" @click="acciones.cotizar">
            {{ acciones.guardando.value ? "Cotizando..." : "Cotizar" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
