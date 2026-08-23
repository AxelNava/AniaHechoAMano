<script setup lang="ts">
import { computed, onMounted, shallowRef } from "vue";
import { useRoute } from "vue-router";
import ProductLayout from "@/layouts/ProductLayout.vue";
import { ApiError } from "@/services/http/apiClient";
import { OrdersApi } from "@/services/orders/ordersApi";
import type { PedidoSeguimientoDto } from "@/types/orders/seguimientoDto";
import {
  formatDiaISO,
  getEntregaPendienteTexto,
  getEstadoColor,
  getEstadoLabel,
} from "@/utils/orderDisplay";

const route = useRoute();
const ordersApi = new OrdersApi();

const loading = shallowRef(true);
const error = shallowRef("");
const seguimiento = shallowRef<PedidoSeguimientoDto | null>(null);

const token = computed(() => String(route.params.token ?? ""));
const estadoCodigo = computed(() => seguimiento.value?.estado ?? "");
const estadoTexto = computed(() =>
  estadoCodigo.value ? getEstadoLabel(estadoCodigo.value) : "Sin estado",
);
const estadoColor = computed(() => getEstadoColor(estadoCodigo.value));
const referenciaTexto = computed(
  () => seguimiento.value?.referencia_publica || "Sin referencia disponible",
);

const formatearFecha = (fecha: string | null): string =>
  fecha ? formatDiaISO(fecha.slice(0, 10)) : "";

const fechaSolicitadaTexto = computed(
  () => formatearFecha(seguimiento.value?.fecha_entrega_solicitada ?? null) || "No especificada",
);

const fechaAcordadaTexto = computed(() => {
  const data = seguimiento.value;
  if (!data) return "";
  return (
    formatearFecha(data.fecha_entrega_acordada) || getEntregaPendienteTexto(estadoCodigo.value)
  );
});

const mensajeError = (cause: unknown): string => {
  if (!(cause instanceof ApiError)) {
    return "No se pudo cargar el seguimiento. Intenta de nuevo más tarde.";
  }

  const mensajesPorEstado: Record<number, string> = {
    400: "El enlace de seguimiento no es válido.",
    404: "No encontramos un pedido para este enlace de seguimiento.",
    429: "Has realizado demasiadas consultas. Intenta de nuevo más tarde.",
  };

  return mensajesPorEstado[cause.status ?? 0] ?? "No se pudo cargar el seguimiento. Intenta de nuevo más tarde.";
};

const cargarSeguimiento = async () => {
  loading.value = true;
  error.value = "";
  seguimiento.value = null;

  try {
    seguimiento.value = await ordersApi.getSeguimiento(token.value);
  } catch (cause) {
    error.value = mensajeError(cause);
  } finally {
    loading.value = false;
  }
};

onMounted(cargarSeguimiento);
</script>

<template>
  <ProductLayout>
    <section class="mx-auto max-w-2xl py-10">
      <h1 class="text-text-page text-center text-3xl font-bold">Seguimiento de tu pedido</h1>
      <p class="text-text-page2 mt-2 text-center">
        Consulta el estado y las fechas disponibles de tu solicitud.
      </p>

      <div
        v-if="loading"
        role="status"
        aria-live="polite"
        class="text-text-page2 rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900"
      >
        Cargando el seguimiento...
      </div>

      <div
        v-else-if="error"
        role="alert"
        class="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
      >
        <h2 class="font-semibold">No pudimos cargar tu seguimiento</h2>
        <p class="mt-2">{{ error }}</p>
      </div>

      <div
        v-else-if="seguimiento"
        class="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-text-page2 text-xs uppercase tracking-wide">Referencia</p>
            <p class="text-text-page mt-1 font-mono text-2xl font-bold">{{ referenciaTexto }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span
              :class="[
                'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                estadoColor,
              ]"
            >
              {{ estadoTexto }}
            </span>
            <span
              v-if="seguimiento.retrasado"
              class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20"
            >
              Retrasado
            </span>
          </div>
        </div>

        <dl class="mt-8 grid gap-5 border-t border-gray-100 pt-6 sm:grid-cols-2 dark:border-gray-800">
          <div>
            <dt class="text-text-page2 text-sm">Fecha solicitada</dt>
            <dd class="text-text-page mt-1 font-medium capitalize">{{ fechaSolicitadaTexto }}</dd>
          </div>
          <div>
            <dt class="text-text-page2 text-sm">Fecha acordada</dt>
            <dd class="text-text-page mt-1 font-medium capitalize">{{ fechaAcordadaTexto }}</dd>
          </div>
        </dl>
      </div>

      <div class="mt-8 text-center">
        <RouterLink to="/" class="text-primary underline">Volver al inicio</RouterLink>
      </div>
    </section>
  </ProductLayout>
</template>
