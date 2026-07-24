<script setup lang="ts">
import { computed } from "vue";
import { usePedidoCliente } from "@/composables/pedido/usePedidoCliente";
import { formatDiaISO } from "@/utils/orderDisplay";

// Paso final "Confirmar": revisión compacta antes de enviar. El botón de envío
// vive en la vista del wizard (2 fases + LoadingButton).
const { lineas, contacto, entrega, fechaSolicitada, hayModificaciones, requiereAnticipo } =
  usePedidoCliente();

const totalModificaciones = computed(
  () => lineas.value.filter((linea) => linea.es_modificacion).length,
);

const contactoResumen = computed(() => {
  const partes = [contacto.value.nombre.trim()];
  if (contacto.value.telefono.trim()) partes.push(contacto.value.telefono.trim());
  if (contacto.value.url_perfil.trim()) partes.push(contacto.value.url_perfil.trim());
  return partes.filter(Boolean).join(" · ");
});

const direccionResumen = computed(() => {
  const e = entrega.value;
  const partes = [e.calle, e.numero_casa, e.municipio].map((p) => p?.trim()).filter(Boolean);
  return partes.join(", ");
});
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-text-page text-lg font-semibold">Confirma tu solicitud</h2>
      <p class="text-text-page2 text-sm">Revisa que todo esté correcto antes de enviar.</p>
    </div>

    <dl class="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div>
        <dt class="text-text-page2 text-xs uppercase tracking-wide">Contacto</dt>
        <dd class="text-text-page">{{ contactoResumen || "—" }}</dd>
      </div>

      <div>
        <dt class="text-text-page2 text-xs uppercase tracking-wide">Entrega</dt>
        <dd class="text-text-page">{{ direccionResumen || "Sin dirección capturada" }}</dd>
        <dd v-if="entrega.maps_url?.trim()" class="text-text-page2 text-sm">Con enlace de Maps</dd>
        <dd v-else class="text-amber-600 text-sm">Sin enlace de Maps</dd>
      </div>

      <div>
        <dt class="text-text-page2 text-xs uppercase tracking-wide">Productos</dt>
        <dd class="text-text-page">
          {{ lineas.length }} producto(s)
          <span v-if="totalModificaciones" class="text-primary font-medium">
            · {{ totalModificaciones }} con modificación
          </span>
        </dd>
      </div>

      <div v-if="!hayModificaciones && fechaSolicitada">
        <dt class="text-text-page2 text-xs uppercase tracking-wide">Fecha solicitada</dt>
        <dd class="text-text-page capitalize">{{ formatDiaISO(fechaSolicitada) }}</dd>
      </div>
    </dl>

    <div
      v-if="hayModificaciones"
      class="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-text-page"
    >
      Tu pedido incluye modificaciones, así que quedará <strong>en cotización</strong>.
      Te contactaremos por tu red social para afinar los detalles, el precio y la fecha.
    </div>
    <div
      v-else
      class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-text-page dark:border-gray-700 dark:bg-gray-800"
    >
      Enviaremos tu solicitud y te confirmaremos la fecha
      <template v-if="requiereAnticipo"> y el anticipo requerido</template>.
    </div>
  </div>
</template>
