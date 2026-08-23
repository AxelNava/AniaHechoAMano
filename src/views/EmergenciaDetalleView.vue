<script setup lang="ts">
import { computed, onMounted, shallowRef } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DisponibilidadCalendar, type DiaISO } from "@/components/ui/calendar";
import { useBloqueosEmergencia } from "@/composables/agenda/useBloqueosEmergencia";
import { useDisponibilidad } from "@/composables/pedido/useDisponibilidad";
import {
  formatDate,
  formatDiaISO,
  getEstadoColor,
  getEstadoLabel,
} from "@/utils/orderDisplay";
import type { PedidoAfectadoDto } from "@/types/disponibilidad/emergenciaDto";

const route = useRoute();
const {
  detalle,
  cargandoDetalle,
  contactosEnCurso,
  cargarDetalle,
  marcarContactado,
  resolverAfectado,
  retirarEmergencia,
  retirando,
  resolucionesEnCurso,
} = useBloqueosEmergencia();
const afectadoResolucionId = shallowRef<number | null>(null);
const dialogoResolucion = shallowRef<"opciones" | "cancelar" | "retrasar" | null>(null);
const fechaNueva = shallowRef<DiaISO | null>(null);
const errorResolucion = shallowRef("");
const cargandoDisponibilidadResolucion = shallowRef(false);
const resolviendo = shallowRef(false);
const afectadoResolucion = computed(() =>
  detalle.value?.afectados.find((afectado) => afectado.id === afectadoResolucionId.value) ?? null,
);
const minutosResolucion = computed(() => {
  const afectado = afectadoResolucion.value;
  return afectado?.estado_pedido === "TERMINADO" ? 0 : (afectado?.tiempo_total_minutos ?? 0);
});
const disponibilidad = useDisponibilidad(minutosResolucion);
const emergenciaId = computed<number | null>(() => {
  const raw = route.params.id;
  if (Array.isArray(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 && String(raw).trim() === String(value)
    ? value
    : null;
});
const cargaIniciada = shallowRef(false);
const retiradaDialogoAbierta = shallowRef(false);
const errorRetirada = shallowRef("");
const retiroDeshabilitado = computed(
  () =>
    !detalle.value?.activo ||
    retirando.value ||
    contactosEnCurso.value.size > 0 ||
    resolucionesEnCurso.value.size > 0,
);
const contactoCliente = (afectado: PedidoAfectadoDto): string =>
  afectado.cliente.red_social_contacto?.trim() ||
  afectado.cliente.url_perfil?.trim() ||
  afectado.cliente.telefono?.trim() ||
  "Sin contacto";
const estadoPedido = (afectado: PedidoAfectadoDto): string =>
  afectado.estado_pedido ? getEstadoLabel(afectado.estado_pedido) : "Sin estado";
const resolucion = (afectado: PedidoAfectadoDto): string => {
  const labels = { RETRASADO: "Retrasado", CANCELADO: "Cancelado", OBSOLETO: "Obsoleto" };
  return afectado.resolucion ? labels[afectado.resolucion] : "Sin resolver";
};
const siguienteDiaISO = (dia: DiaISO): DiaISO => {
  const [anio, mes, diaMes] = dia.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, diaMes + 1)).toISOString().slice(0, 10);
};
const minFechaResolucion = computed<DiaISO | undefined>(() => {
  const original = afectadoResolucion.value?.fecha_entrega_original.slice(0, 10);
  const estrictamentePosterior = original ? siguienteDiaISO(original) : undefined;
  const minDisponibilidad = disponibilidad.minFecha.value;
  if (!estrictamentePosterior) return minDisponibilidad;
  return minDisponibilidad > estrictamentePosterior ? minDisponibilidad : estrictamentePosterior;
});
const mostrarResolver = (afectado: PedidoAfectadoDto): boolean =>
  detalle.value?.activo === true && afectado.contactado && afectado.resolucion === null;
const resolverDeshabilitado = (afectado: PedidoAfectadoDto): boolean =>
  retirando.value || resolucionesEnCurso.value.has(afectado.id);
const puedeConfirmarResolucion = computed(() => {
  const afectado = afectadoResolucion.value;
  return (
    detalle.value?.activo === true &&
    afectado !== null &&
    afectado.contactado &&
    afectado.resolucion === null &&
    !retirando.value &&
    !resolviendo.value &&
    !resolucionesEnCurso.value.has(afectado.id)
  );
});
const disponibilidadOcupada = computed(
  () => cargandoDisponibilidadResolucion.value || disponibilidad.cargandoMes.value,
);
const limpiarResolucion = () => {
  dialogoResolucion.value = null;
  afectadoResolucionId.value = null;
  fechaNueva.value = null;
  errorResolucion.value = "";
};
const abrirResolucion = (afectado: PedidoAfectadoDto) => {
  if (!mostrarResolver(afectado) || resolverDeshabilitado(afectado)) return;
  afectadoResolucionId.value = afectado.id;
  fechaNueva.value = null;
  errorResolucion.value = "";
  dialogoResolucion.value = "opciones";
};
const abrirCancelacion = () => {
  if (!puedeConfirmarResolucion.value) return;
  errorResolucion.value = "";
  dialogoResolucion.value = "cancelar";
};
const abrirDesplazamiento = async () => {
  if (!puedeConfirmarResolucion.value) return;
  fechaNueva.value = null;
  errorResolucion.value = "";
  dialogoResolucion.value = "retrasar";
  cargandoDisponibilidadResolucion.value = true;
  try {
    await disponibilidad.recargar();
  } catch {
    errorResolucion.value = "No se pudo cargar la disponibilidad. Puedes cerrar e intentarlo de nuevo.";
  } finally {
    cargandoDisponibilidadResolucion.value = false;
  }
};
const volverAOpciones = () => {
  if (resolviendo.value) return;
  errorResolucion.value = "";
  dialogoResolucion.value = "opciones";
};
const actualizarResolucionDialogo = (abierto: boolean) => {
  if (!abierto && !resolviendo.value) limpiarResolucion();
};
const evaluarFechaResolucion = (fecha: DiaISO) => {
  fechaNueva.value = fecha;
  void disponibilidad.evaluarFecha(fecha);
};
const confirmarCancelacion = async () => {
  const emergencia = detalle.value;
  const afectado = afectadoResolucion.value;
  if (!emergencia || !afectado || !puedeConfirmarResolucion.value) return;
  errorResolucion.value = "";
  resolviendo.value = true;
  let exito = false;
  try {
    exito = await resolverAfectado(emergencia.id, afectado.id, { resolucion: "CANCELADO" });
  } catch {
    // Se muestra el mismo mensaje para respuestas fallidas o excepciones del adaptador.
  }
  try {
    await disponibilidad.recargar();
  } catch {
    // La resolución conserva su resultado aunque falle la actualización visual.
  }
  if (exito) {
    limpiarResolucion();
  } else {
    errorResolucion.value = "No se pudo resolver el pedido. Puedes intentarlo de nuevo.";
  }
  resolviendo.value = false;
};
const confirmarDesplazamiento = async () => {
  const emergencia = detalle.value;
  const afectado = afectadoResolucion.value;
  const nuevaFecha = fechaNueva.value;
  if (!emergencia || !afectado || !nuevaFecha || !puedeConfirmarResolucion.value) return;
  errorResolucion.value = "";
  resolviendo.value = true;
  let exito = false;
  try {
    exito = await resolverAfectado(emergencia.id, afectado.id, {
      resolucion: "RETRASADO",
      nueva_fecha: nuevaFecha,
    });
  } catch {
    // Se muestra el mismo mensaje para respuestas fallidas o excepciones del adaptador.
  }
  try {
    await disponibilidad.recargar();
  } catch {
    // La resolución conserva su resultado aunque falle la actualización visual.
  }
  if (exito) {
    limpiarResolucion();
  } else {
    errorResolucion.value = "No se pudo resolver el pedido. Puedes intentarlo de nuevo.";
  }
  resolviendo.value = false;
};
const cambiarContacto = (afectado: PedidoAfectadoDto, contactado: boolean) => {
  const emergencia = detalle.value;
  if (!emergencia?.activo || retirando.value) return;
  void marcarContactado(emergencia.id, afectado.id, { contactado });
};
const abrirRetirada = () => {
  if (retiroDeshabilitado.value) return;
  errorRetirada.value = "";
  retiradaDialogoAbierta.value = true;
};
const cerrarRetirada = () => {
  if (retirando.value) return;
  retiradaDialogoAbierta.value = false;
  errorRetirada.value = "";
};
const actualizarRetiradaDialogo = (abierto: boolean) => {
  if (!abierto) cerrarRetirada();
};
const confirmarRetirada = async () => {
  const emergencia = detalle.value;
  if (!emergencia || retiroDeshabilitado.value) return;
  errorRetirada.value = "";
  try {
    const exito = await retirarEmergencia(emergencia.id);
    if (exito) {
      retiradaDialogoAbierta.value = false;
      return;
    }
  } catch {
    // Se muestra el mismo mensaje para respuestas fallidas o excepciones del adaptador.
  }
  errorRetirada.value = "No se pudo retirar la emergencia. Puedes intentarlo de nuevo.";
};
onMounted(() => {
  if (emergenciaId.value === null) return;
  cargaIniciada.value = true;
  void cargarDetalle(emergenciaId.value);
});
</script>
<template>
  <div class="text-text-page mx-auto max-w-5xl space-y-6 p-6">
    <RouterLink to="/admin/agenda" class="text-sm text-gray-500 hover:text-gray-800">
      ← Volver a la agenda
    </RouterLink>
    <div v-if="emergenciaId === null" class="rounded-md bg-red-100 p-4 text-red-700" role="alert">
      El identificador de la emergencia no es válido.
    </div>
    <div
      v-else-if="cargandoDetalle || !cargaIniciada"
      class="py-12 text-center text-gray-500"
      role="status"
    >
      Cargando emergencia...
    </div>
    <div v-else-if="!detalle" class="rounded-md bg-red-100 p-4 text-red-700" role="alert">
      No se encontró la emergencia.
    </div>
    <div v-else class="space-y-6">
      <section class="rounded-lg bg-white p-6 shadow ring-1 ring-secondary dark:bg-gray-900">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-2xl font-bold">Detalle de emergencia</h1>
            <p class="mt-1 capitalize">
              {{ formatDiaISO(detalle.desde) }} — {{ formatDiaISO(detalle.hasta) }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              :class="[
                'rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                detalle.activo
                  ? 'bg-green-100 text-green-800 ring-green-600/20'
                  : 'bg-gray-100 text-gray-800 ring-gray-600/20',
              ]"
            >
              {{ detalle.activo ? "Activa" : "Retirada" }}
            </span>
            <Button
              v-if="detalle.activo"
              type="button"
              variant="outline"
              :disabled="retiroDeshabilitado"
              @click="abrirRetirada"
            >
              {{ retirando ? "Retirando..." : "Retirar emergencia" }}
            </Button>
          </div>
        </div>
        <p v-if="detalle.motivo" class="mt-4 text-sm">
          <span class="font-medium">Motivo:</span> {{ detalle.motivo }}
        </p>
        <p v-else class="text-text-page2 mt-4 text-sm">Sin motivo indicado.</p>
        <dl class="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-text-page2">Creada</dt>
            <dd class="font-medium">{{ formatDate(detalle.creado_en) }}</dd>
          </div>
          <div>
            <dt class="text-text-page2">Retirada</dt>
            <dd class="font-medium">
              {{ detalle.retirado_en ? formatDate(detalle.retirado_en) : "No retirada" }}
            </dd>
          </div>
        </dl>
      </section>
      <section class="rounded-lg bg-white p-6 shadow ring-1 ring-secondary dark:bg-gray-900">
        <h2 class="mb-3 text-lg font-semibold">Resumen</h2>
        <dl class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-text-page2">Total afectados</dt>
            <dd class="text-lg font-semibold">{{ detalle.total_afectados }}</dd>
          </div>
          <div>
            <dt class="text-text-page2">Pendientes de contacto</dt>
            <dd class="text-lg font-semibold">{{ detalle.pendientes_contacto }}</dd>
          </div>
          <div>
            <dt class="text-text-page2">Pendientes de resolución</dt>
            <dd class="text-lg font-semibold">{{ detalle.pendientes_resolucion }}</dd>
          </div>
        </dl>
      </section>
      <section class="rounded-lg bg-white p-6 shadow ring-1 ring-secondary dark:bg-gray-900">
        <h2 class="mb-3 text-lg font-semibold">Días afectados</h2>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <h3 class="text-sm font-medium">Días bloqueados</h3>
            <ul v-if="detalle.dias_bloqueados.length" class="mt-2 list-disc pl-5 text-sm capitalize">
              <li v-for="dia in detalle.dias_bloqueados" :key="dia">{{ formatDiaISO(dia) }}</li>
            </ul>
            <p v-else class="text-text-page2 mt-2 text-sm">No hay días bloqueados.</p>
          </div>
          <div>
            <h3 class="text-sm font-medium">Días con bloqueo manual</h3>
            <ul
              v-if="detalle.dias_con_bloqueo_manual.length"
              class="mt-2 list-disc pl-5 text-sm capitalize"
            >
              <li v-for="dia in detalle.dias_con_bloqueo_manual" :key="dia">
                {{ formatDiaISO(dia) }}
              </li>
            </ul>
            <p v-else class="text-text-page2 mt-2 text-sm">No hay coincidencias manuales.</p>
          </div>
        </div>
      </section>
      <section class="rounded-lg bg-white p-6 shadow ring-1 ring-secondary dark:bg-gray-900">
        <h2 class="mb-3 text-lg font-semibold">Pedidos afectados</h2>
        <p v-if="detalle.afectados.length === 0" class="text-text-page2 text-sm">
          No hay pedidos afectados.
        </p>
        <div v-else class="space-y-3">
          <article
            v-for="afectado in detalle.afectados"
            :key="afectado.id"
            class="rounded-md border border-gray-200 p-4 dark:border-gray-700"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="font-semibold">{{ afectado.cliente.nombre }}</h3>
                <p class="text-text-page2 text-sm">
                  <span class="font-medium">Contacto:</span> {{ contactoCliente(afectado) }}
                </p>
              </div>
              <label
                :for="`contactado-${afectado.id}`"
                class="inline-flex items-center gap-2 text-sm font-medium"
              >
                <Checkbox
                  :id="`contactado-${afectado.id}`"
                  :checked="afectado.contactado"
                  :disabled="
                    !detalle.activo ||
                    contactosEnCurso.has(afectado.id) ||
                    resolucionesEnCurso.has(afectado.id) ||
                    retirando
                  "
                  @update:checked="(valor) => cambiarContacto(afectado, valor === true)"
                />
                Contactado
              </label>
            </div>
            <dl class="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-text-page2">Pedido</dt>
                <dd class="font-medium">
                  <RouterLink
                    :to="{
                      name: 'admin-order-detail',
                      params: { pedidoId: afectado.pedido_id },
                    }"
                    class="text-primary hover:underline"
                  >
                    {{ afectado.referencia_publica ?? `#${afectado.pedido_id}` }}
                  </RouterLink>
                </dd>
              </div>
              <div>
                <dt class="text-text-page2">Fecha de entrega original</dt>
                <dd class="font-medium capitalize">
                  {{ formatDiaISO(afectado.fecha_entrega_original.slice(0, 10)) }}
                </dd>
              </div>
              <div>
                <dt class="text-text-page2">Estado del pedido</dt>
                <dd>
                  <span
                    :class="[
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                      getEstadoColor(afectado.estado_pedido ?? ''),
                    ]"
                  >
                    {{ estadoPedido(afectado) }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-text-page2">Resolución existente</dt>
                <dd class="font-medium">{{ resolucion(afectado) }}</dd>
              </div>
            </dl>
            <p v-if="afectado.nueva_fecha" class="text-text-page2 mt-3 text-sm">
              Nueva fecha:
              <span class="capitalize">{{ formatDiaISO(afectado.nueva_fecha.slice(0, 10)) }}</span>
            </p>
                <Button
                  v-if="mostrarResolver(afectado)"
                  type="button"
                  :disabled="resolverDeshabilitado(afectado)"
                  @click="abrirResolucion(afectado)"
                >
                  Resolver
                </Button>
              </article>
        </div>
      </section>
    </div>

    <Dialog
      :open="dialogoResolucion !== null"
      @update:open="actualizarResolucionDialogo"
    >
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resolver pedido</DialogTitle>
          <DialogDescription v-if="afectadoResolucion">
            {{ afectadoResolucion.cliente.nombre }} — elige cómo resolver este pedido afectado.
          </DialogDescription>
        </DialogHeader>
        <p v-if="errorResolucion" class="rounded-md bg-red-100 p-3 text-sm text-red-700" role="alert">
          {{ errorResolucion }}
        </p>
        <div v-if="dialogoResolucion === 'opciones'" class="space-y-3">
          <p class="text-sm">Puedes cancelar el pedido o desplazar su entrega a otra fecha disponible.</p>
          <div class="flex flex-wrap gap-2">
            <Button type="button" @click="abrirCancelacion">Cancelar pedido</Button>
            <Button type="button" variant="outline" @click="abrirDesplazamiento">
              Desplazar entrega
            </Button>
          </div>
        </div>
        <div v-else-if="dialogoResolucion === 'cancelar'" class="space-y-3">
          <p class="text-sm font-medium">¿Confirmas la cancelación de este pedido?</p>
          <p class="text-sm text-gray-600">
            Esta acción marcará el pedido como cancelado y no se puede deshacer desde esta pantalla.
          </p>
        </div>
        <div v-else-if="dialogoResolucion === 'retrasar'" class="space-y-4">
          <p class="text-sm">Elige una nueva fecha posterior a la fecha de entrega original.</p>
          <div class="flex flex-col items-start gap-4 sm:flex-row">
            <DisponibilidadCalendar
              v-model:mes-visible="disponibilidad.mesVisible.value"
              :fecha-seleccionada="fechaNueva"
              :dias-disponibles="disponibilidad.diasDisponibles.value"
              :dias-deshabilitados="disponibilidad.diasDeshabilitados.value"
              :min-fecha="minFechaResolucion"
              @update:fecha-seleccionada="evaluarFechaResolucion"
            />
            <div class="min-w-0 flex-1 text-sm">
              <p v-if="disponibilidadOcupada" role="status">Cargando disponibilidad...</p>
              <p v-else-if="fechaNueva" class="capitalize">
                Nueva fecha: {{ formatDiaISO(fechaNueva) }}
              </p>
              <p v-else class="text-gray-500">Elige un día disponible.</p>
            </div>
          </div>
        </div>
        <DialogFooter v-if="dialogoResolucion === 'opciones'">
          <Button type="button" variant="outline" @click="limpiarResolucion">Decidir después</Button>
        </DialogFooter>
        <DialogFooter v-else-if="dialogoResolucion === 'cancelar'">
          <Button type="button" variant="outline" :disabled="resolviendo" @click="volverAOpciones">
            Volver
          </Button>
          <Button type="button" :disabled="!puedeConfirmarResolucion" @click="confirmarCancelacion">
            {{ resolviendo ? "Cancelando..." : "Confirmar cancelación" }}
          </Button>
        </DialogFooter>
        <DialogFooter v-else-if="dialogoResolucion === 'retrasar'">
          <Button
            type="button"
            variant="outline"
            :disabled="resolviendo || disponibilidadOcupada"
            @click="volverAOpciones"
          >
            Volver
          </Button>
          <Button
            type="button"
            :disabled="!fechaNueva || disponibilidadOcupada || !puedeConfirmarResolucion"
            @click="confirmarDesplazamiento"
          >
            {{ resolviendo ? "Guardando..." : "Confirmar desplazamiento" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="retiradaDialogoAbierta" @update:open="actualizarRetiradaDialogo">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retirar emergencia</DialogTitle>
          <DialogDescription>
            Retirar esta emergencia libera el bloque, conserva la auditoría y el historial, y no
            deshace las resoluciones existentes.
          </DialogDescription>
        </DialogHeader>
        <p v-if="errorRetirada" class="rounded-md bg-red-100 p-3 text-sm text-red-700" role="alert">
          {{ errorRetirada }}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="retirando" @click="cerrarRetirada">
            Cancelar
          </Button>
          <Button type="button" :disabled="retiroDeshabilitado" @click="confirmarRetirada">
            {{ retirando ? "Retirando..." : "Confirmar retirada" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
