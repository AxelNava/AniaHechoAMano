<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Inbox, MessageCircle } from "lucide-vue-next";
import { OrdersApi } from "@/services/orders/ordersApi";
import { configApi } from "@/services/config/configApi";
import { resolveProductImageUrl } from "@/services/products/productApi";
import HistoryErrorState from "@/components/dashboard/HistoryErrorState.vue";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  formatDiaISO,
  getClienteNombre,
  getEstadoColor,
  getEstadoLabel,
} from "@/utils/orderDisplay";
import type { PedidoHistorialListItemDto, PedidoProductoDto } from "@/types/orders/orderHistoryDto";
import type { ContactoConfigDto } from "@/types/config/contactoDto";

// Bandeja de solicitudes entrantes que requieren acción manual del admin:
// modificaciones por cotizar (COTIZANDO) y pedidos fijos por confirmar
// (PENDIENTE_CONFIRMACION). Vista dedicada (no un filtro del historial) porque
// su propósito es accionar: muestra la descripción/fotos de la modificación y un
// atajo para contactar al cliente por Facebook. Las acciones de confirmar/cotizar
// viven en el detalle del pedido (OrderDetailView).
const ESTADOS_BANDEJA = ["COTIZANDO", "PENDIENTE_CONFIRMACION"] as const;

const ordersApi = new OrdersApi();

const loading = ref(true);
const refreshing = ref(false);
const error = ref("");
const solicitudes = ref<PedidoHistorialListItemDto[]>([]);
const contactoConfig = ref<ContactoConfigDto | null>(null);

const loadData = async () => {
  const respuestas = await Promise.all(
    ESTADOS_BANDEJA.map((estado) => ordersApi.getAllOrders({ estado, limit: 200 })),
  );
  solicitudes.value = respuestas
    .flatMap((r) => r.data)
    // Más recientes primero (los pedidos sin fecha de entrega firme se ordenan
    // por su fecha de solicitud).
    .sort((a, b) => (a.fecha_solicitud < b.fecha_solicitud ? 1 : -1));
};

const fetchSolicitudes = async (esRefresco = false) => {
  const flag = esRefresco ? refreshing : loading;
  flag.value = true;
  error.value = "";
  try {
    await loadData();
  } catch {
    error.value = "Error al cargar las solicitudes";
  } finally {
    flag.value = false;
  }
};

// Líneas con modificación (traen descripción del cliente + fotos de referencia).
const modificaciones = (pedido: PedidoHistorialListItemDto): PedidoProductoDto[] =>
  pedido.productos.filter((linea) => linea.es_modificacion);

const fechaSolicitadaTexto = (pedido: PedidoHistorialListItemDto): string | null =>
  pedido.fecha_entrega_solicitada
    ? formatDiaISO(pedido.fecha_entrega_solicitada.slice(0, 10))
    : null;

// Enlace de contacto por Facebook con la referencia prellenada (misma fuente que
// la pantalla de confirmación pública: la config del backend). Abre el Messenger
// de la página; si no hay plantilla, cae a la URL de la página.
const enlaceFacebook = (pedido: PedidoHistorialListItemDto): string => {
  const cfg = contactoConfig.value;
  if (!cfg) return "";
  const ref = pedido.referencia_publica ?? String(pedido.id);
  if (cfg.messenger_url_template) {
    return cfg.messenger_url_template.replace("{ref}", encodeURIComponent(ref));
  }
  return cfg.facebook_page_url;
};

const hayContacto = computed(() => Boolean(contactoConfig.value));

onMounted(async () => {
  contactoConfig.value = await configApi.getContacto();
  await fetchSolicitudes();
});
</script>

<template>
  <div class="mx-auto max-w-5xl p-6">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-text-page flex items-center gap-2 text-2xl font-bold">
        <Inbox class="size-6" />
        Solicitudes
      </h1>
      <button
        v-if="!error"
        type="button"
        :disabled="refreshing || loading"
        class="border-text-page/30 text-text-page hover:bg-primary inline-flex items-center rounded-md border bg-white px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        @click="fetchSolicitudes(true)"
      >
        {{ refreshing ? "Actualizando..." : "Actualizar" }}
      </button>
    </div>

    <p class="text-text-page2 mb-6 text-sm">
      Modificaciones por cotizar y pedidos fijos por confirmar. Abre el detalle para
      cotizar o confirmar cada solicitud.
    </p>

    <div v-if="loading" class="text-text-page2 py-12 text-center">Cargando solicitudes...</div>

    <HistoryErrorState
      v-else-if="error"
      :message="error"
      :retrying="refreshing"
      @retry="fetchSolicitudes(true)"
    />

    <div
      v-else-if="solicitudes.length === 0"
      class="ring-secondary text-text-page2 rounded-lg bg-white p-8 text-center shadow ring-1 dark:bg-gray-900"
    >
      No hay solicitudes pendientes.
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="pedido in solicitudes"
        :key="pedido.id"
        class="ring-secondary rounded-lg bg-white p-5 shadow ring-1 dark:bg-gray-900"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-text-page font-mono text-sm font-bold">
                {{ pedido.referencia_publica ?? `#${pedido.id}` }}
              </span>
              <span
                :class="[
                  'rounded-full px-2.5 py-0.5 text-xs font-medium ring-1',
                  getEstadoColor(pedido.estado),
                ]"
              >
                {{ getEstadoLabel(pedido.estado) }}
              </span>
            </div>
            <p class="text-text-page mt-1 text-sm font-medium">{{ getClienteNombre(pedido) }}</p>
          </div>

          <div class="text-right text-xs">
            <p class="text-text-page2">Solicitado: {{ formatDate(pedido.fecha_solicitud) }}</p>
            <p v-if="fechaSolicitadaTexto(pedido)" class="text-text-page capitalize">
              Fecha pedida: {{ fechaSolicitadaTexto(pedido) }}
            </p>
          </div>
        </div>

        <!-- Modificaciones: descripción + miniaturas -->
        <div v-if="modificaciones(pedido).length" class="mt-4 space-y-3">
          <div
            v-for="linea in modificaciones(pedido)"
            :key="linea.id"
            class="rounded-md bg-gray-50 p-3 dark:bg-gray-800/50"
          >
            <p class="text-text-page2 text-xs uppercase tracking-wide">Modificación solicitada</p>
            <p class="text-text-page text-sm">{{ linea.descripcion_cliente }}</p>
            <div v-if="linea.imagenes.length" class="mt-2 flex flex-wrap gap-2">
              <a
                v-for="img in linea.imagenes"
                :key="img.id"
                :href="resolveProductImageUrl(img.url)"
                target="_blank"
                rel="noopener"
                class="ring-secondary block size-16 overflow-hidden rounded-md ring-1"
              >
                <img
                  :src="resolveProductImageUrl(img.url)"
                  :alt="img.alt ?? 'Referencia de la modificación'"
                  class="size-full object-cover"
                />
              </a>
            </div>
          </div>
        </div>

        <!-- Pedido fijo: resumen de líneas -->
        <ul v-else class="text-text-page2 mt-4 space-y-1 text-sm">
          <li v-for="linea in pedido.productos" :key="linea.id" class="truncate">
            • {{ linea.descripcion_cliente }}
          </li>
        </ul>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <RouterLink
            :to="{ name: 'admin-order-detail', params: { pedidoId: pedido.id } }"
            class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            Ver detalle
          </RouterLink>
          <Button
            v-if="hayContacto"
            as="a"
            variant="outline"
            :href="enlaceFacebook(pedido)"
            target="_blank"
            rel="noopener"
          >
            <MessageCircle class="size-4" />
            Contactar por Facebook
          </Button>
        </div>
      </article>
    </div>
  </div>
</template>
