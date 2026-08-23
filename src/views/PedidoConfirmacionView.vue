<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { toast } from "vue-sonner";
import { CheckCircle2 } from "lucide-vue-next";
import ProductLayout from "@/layouts/ProductLayout.vue";
import { Button } from "@/components/ui/button";
import { configApi } from "@/services/config/configApi";
import { usePedidoClienteStore } from "@/stores/pedidoClienteStore";
import { formatCurrency, formatDiaISO } from "@/utils/orderDisplay";
import type { ContactoConfigDto } from "@/types/config/contactoDto";

const route = useRoute();
const store = usePedidoClienteStore();

const referencia = computed(() => String(route.params.ref ?? ""));

// El resumen persistido solo es válido si corresponde a ESTA referencia (evita
// mostrar datos de un pedido anterior si el usuario navega manualmente).
const resumen = computed(() =>
  store.ultimoResumen && store.ultimoResumen.referencia_publica === referencia.value
    ? store.ultimoResumen
    : null,
);

const contactoConfig = ref<ContactoConfigDto | null>(null);

const mensajeSugerido = computed(
  () =>
    `Hola, quiero dar seguimiento a mi pedido ${referencia.value}. ` +
    "Adjunto las referencias de la modificación que solicité.",
);

const enlaceFacebook = computed(() => {
  const cfg = contactoConfig.value;
  if (!cfg) return "";
  if (cfg.messenger_url_template) {
    return cfg.messenger_url_template.replace("{ref}", encodeURIComponent(referencia.value));
  }
  return cfg.facebook_page_url;
});

const copiarMensaje = async () => {
  try {
    await navigator.clipboard.writeText(mensajeSugerido.value);
    toast.success("Mensaje copiado");
  } catch {
    toast.error("No se pudo copiar. Selecciónalo manualmente.");
  }
};

onMounted(async () => {
  contactoConfig.value = await configApi.getContacto();
});
</script>

<template>
  <ProductLayout>
    <section class="mx-auto max-w-2xl py-10 text-center">
      <CheckCircle2 class="text-primary mx-auto mb-4 size-16" />
      <h1 class="text-text-page text-3xl font-bold">¡Solicitud recibida!</h1>
      <p class="text-text-page2 mt-2">
        Guarda tu número de referencia para dar seguimiento a tu pedido.
      </p>

      <div class="mt-6 inline-block rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-8 py-4">
        <p class="text-text-page2 text-xs uppercase tracking-wide">Referencia</p>
        <p class="text-text-page font-mono text-2xl font-bold">{{ referencia }}</p>
      </div>

      <!-- Resumen del pedido -->
      <div
        v-if="resumen"
        class="mt-8 rounded-2xl border border-gray-200 p-6 text-left dark:border-gray-700"
      >
        <h2 class="text-text-page mb-3 font-semibold">Resumen</h2>
        <ul class="divide-y divide-gray-100 dark:divide-gray-800">
          <li
            v-for="(linea, index) in resumen.lineas"
            :key="index"
            class="flex items-center justify-between gap-4 py-2"
          >
            <span class="text-text-page min-w-0 truncate">
              {{ linea.nombre }}
              <span v-if="linea.es_modificacion" class="text-primary text-xs font-medium">
                (modificación)
              </span>
            </span>
            <span class="text-text-page2 shrink-0 text-sm">
              {{ linea.es_modificacion ? "A cotizar" : formatCurrency(linea.precio_base) }}
            </span>
          </li>
        </ul>

        <p v-if="resumen.fecha_solicitada" class="text-text-page2 mt-3 text-sm">
          Fecha solicitada:
          <span class="text-text-page capitalize">{{ formatDiaISO(resumen.fecha_solicitada) }}</span>
        </p>
        <p v-if="resumen.requiere_anticipo" class="mt-1 text-sm text-amber-600">
          Este pedido requiere anticipo; te indicaremos el monto al confirmarlo.
        </p>
        <p v-if="resumen.fotos_pendientes" class="mt-1 text-sm text-amber-600">
          Algunas fotos no se subieron. Envíalas al contactarnos por Facebook.
        </p>
      </div>

      <RouterLink
        v-if="resumen && resumen.seguimiento_token_publico"
        :to="{
          name: 'pedido-seguimiento',
          params: { token: resumen.seguimiento_token_publico },
        }"
        class="bg-primary text-primary-foreground inline-flex rounded-md px-4 py-2 font-medium shadow-sm transition-opacity hover:opacity-90"
      >
        Consultar el seguimiento de tu pedido
      </RouterLink>

      <!-- Siguiente paso -->
      <div class="mt-8">
        <template v-if="!resumen || resumen.hay_modificaciones">
          <p class="text-text-page2 mb-4">
            Como tu pedido incluye una modificación, lo revisaremos y te
            contactaremos para cotizarlo. También puedes escribirnos tú:
          </p>
          <div class="mx-auto max-w-md space-y-3">
            <div class="rounded-lg bg-gray-100 p-3 text-left text-sm text-text-page dark:bg-gray-800">
              {{ mensajeSugerido }}
            </div>
            <div class="flex flex-col justify-center gap-2 sm:flex-row">
              <Button variant="outline" @click="copiarMensaje">Copiar mensaje</Button>
              <Button v-if="enlaceFacebook" as="a" :href="enlaceFacebook" target="_blank" rel="noopener">
                Contactar por Facebook
              </Button>
            </div>
          </div>
        </template>
        <p v-else class="text-text-page2">
          Revisaremos tu solicitud y te confirmaremos la fecha
          <template v-if="resumen.requiere_anticipo"> y el anticipo</template>
          por el medio de contacto que nos dejaste.
        </p>
      </div>

      <div class="mt-10">
        <RouterLink to="/" class="text-primary underline">Volver al inicio</RouterLink>
      </div>
    </section>
  </ProductLayout>
</template>
