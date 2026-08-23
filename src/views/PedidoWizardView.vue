<script setup lang="ts">
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";
import ProductLayout from "@/layouts/ProductLayout.vue";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import PasoContacto from "@/components/pedido/PasoContacto.vue";
import PasoDireccion from "@/components/pedido/PasoDireccion.vue";
import PasoFecha from "@/components/pedido/PasoFecha.vue";
import PasoResumen from "@/components/pedido/PasoResumen.vue";
import PasoConfirmar from "@/components/pedido/PasoConfirmar.vue";
import { usePedidoCliente } from "@/composables/pedido/usePedidoCliente";
import { usePedidoWizard } from "@/composables/pedido/usePedidoWizard";
import { usePedidoClienteStore } from "@/stores/pedidoClienteStore";
import { useLoadingButton } from "@/composables/useLoadingButton";
import { OrdersApi } from "@/services/orders/ordersApi";

const router = useRouter();
const ordersApi = new OrdersApi();
const store = usePedidoClienteStore();
const cliente = usePedidoCliente();
const wizard = usePedidoWizard();

const { status, message, execute } = useLoadingButton({ successDuration: 2500 });

const continuar = () => {
  const pasoPrevio = wizard.pasoActualId.value;
  const avanzo = wizard.siguiente();
  // Soft-gate de Maps: la 1ª omisión no avanza y avisa (además del banner).
  if (!avanzo && pasoPrevio === "direccion" && wizard.validationError.value) {
    toast.warning(wizard.validationError.value);
  }
};

const irAlCatalogo = () => {
  // Conserva el carrito (persistido en el store) y deja elegir otra categoría.
  router.push("/");
};

const enviar = async () => {
  // Revalida los pasos previos por si se llegó aquí con datos incompletos.
  if (cliente.estaVacio.value) {
    toast.error("Tu pedido está vacío. Agrega al menos un producto.");
    return;
  }

  await execute(async () => {
    const payload = cliente.construirPayload();

    // Fase 1: crear la solicitud (JSON).
    let detalle;
    try {
      detalle = await ordersApi.createOrderPublico(payload);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "No se pudo enviar la solicitud.";
      toast.error(mensaje);
      throw e;
    }

    // Fase 2: subir fotos por línea (solo modificaciones con fotos). Un fallo
    // parcial NO revierte el pedido: queda creado y se avisa para reintentar.
    let fotosPendientes = false;
    const lineas = cliente.lineas.value;
    for (let i = 0; i < lineas.length; i += 1) {
      const archivos = cliente.fotosPorLinea.value[lineas[i].uid];
      const lineaCreada = detalle.productos[i];
      if (archivos?.length && lineaCreada) {
        try {
          await ordersApi.uploadModificacionImagenes(detalle.id, lineaCreada.id, archivos);
        } catch {
          fotosPendientes = true;
        }
      }
    }

    const referencia = detalle.referencia_publica ?? String(detalle.id);

    // Snapshot para la confirmación ANTES de vaciar el carrito.
    store.ultimoResumen = {
      ...cliente.construirResumen(referencia, fotosPendientes),
      seguimiento_token_publico: detalle.seguimiento_token_publico ?? null,
    };
    cliente.limpiarCarrito();

    if (fotosPendientes) {
      toast.warning(
        "Tu pedido se creó, pero algunas fotos no se subieron. Podrás enviárnoslas al contactarnos.",
      );
    } else {
      toast.success("¡Solicitud enviada!");
    }

    router.push(`/pedido/confirmacion/${encodeURIComponent(referencia)}`);
  });
};
</script>

<template>
  <ProductLayout>
    <!-- Carrito vacío -->
    <div v-if="cliente.estaVacio.value" class="py-24 text-center">
      <h1 class="text-text-page mb-2 text-2xl font-bold">Tu pedido está vacío</h1>
      <p class="text-text-page2 mb-6">Elige un producto del catálogo para empezar.</p>
      <Button @click="irAlCatalogo">Ir al catálogo</Button>
    </div>

    <section v-else class="mx-auto max-w-3xl py-6">
      <h1 class="text-text-page mb-6 text-2xl font-bold">Tu pedido</h1>

      <Stepper :pasos="wizard.stepperPasos.value" :paso-actual="wizard.pasoActual.value" navegable
        class="mb-8" @seleccionar-paso="wizard.irAPaso" />

      <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <PasoContacto v-if="wizard.pasoActualId.value === 'contacto'" />
        <PasoDireccion v-else-if="wizard.pasoActualId.value === 'direccion'" />
        <PasoFecha v-else-if="wizard.pasoActualId.value === 'fecha'" />
        <PasoResumen v-else-if="wizard.pasoActualId.value === 'resumen'" />
        <PasoConfirmar v-else-if="wizard.pasoActualId.value === 'confirmar'" />

        <p
          v-if="wizard.validationError.value"
          class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
        >
          {{ wizard.validationError.value }}
        </p>
      </div>

      <!-- Navegación -->
      <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div class="flex gap-2">
          <Button
            v-if="!wizard.esPrimerPaso.value"
            variant="outline"
            :disabled="status === 'loading'"
            @click="wizard.anterior"
          >
            Anterior
          </Button>
          <Button variant="ghost" :disabled="status === 'loading'" @click="irAlCatalogo">
            + Agregar otro producto
          </Button>
        </div>

        <Button v-if="!wizard.esUltimoPaso.value" @click="continuar">Continuar</Button>
        <LoadingButton
          v-else
          :loading="status === 'loading'"
          :status="status"
          :message="message"
          @click="enviar"
        >
          Enviar solicitud
        </LoadingButton>
      </div>
    </section>
  </ProductLayout>
</template>
