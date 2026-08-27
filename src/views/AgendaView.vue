<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef } from "vue";
import { CalendarClock, ChevronDown, Trash2 } from "lucide-vue-next";
import { DisponibilidadCalendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAgenda, TIPO_BLOQUEO_LABELS } from "@/composables/agenda/useAgenda";
import { useBloqueosEmergencia } from "@/composables/agenda/useBloqueosEmergencia";
import { formatDiaISO } from "@/utils/orderDisplay";
import type { BloqueoDto, TipoBloqueoAgenda } from "@/types/disponibilidad/agendaDto";
import type {
  BloqueoEmergenciaListItemDto,
  CreateBloqueoEmergenciaDto,
} from "@/types/disponibilidad/emergenciaDto";
import type { DiaISO } from "@/components/ui/calendar";

const {
  config,
  form,
  cargandoConfig,
  guardandoConfig,
  guardarConfig,
  mesVisible,
  bloqueosParaLista,
  bloqueosPorFecha,
  diasBloqueados,
  guardandoBloqueo,
  impactoBloqueo,
  cargandoImpactoBloqueo,
  errorImpactoBloqueo,
  consultarImpactoBloqueo,
  limpiarImpactoBloqueo,
  crearBloqueo,
  eliminarBloqueo,
  cargarTodo,
} = useAgenda();

const TIPOS: TipoBloqueoAgenda[] = ["FERIADO", "PERSONAL", "OCUPADO"];

const {
  emergencias,
  cargandoLista: cargandoEmergencias,
  creando: creandoEmergencia,
  cargarEmergencias,
  crearEmergencia,
} = useBloqueosEmergencia();

// --- Formulario de bloqueo de emergencia ---
const formularioEmergencia = reactive<CreateBloqueoEmergenciaDto>({
  desde: "",
  hasta: "",
  motivo: "",
});
const mensajeErrorEmergencia = shallowRef("");

const validarFormularioEmergencia = (): CreateBloqueoEmergenciaDto | null => {
  const desde = formularioEmergencia.desde.trim();
  const hasta = formularioEmergencia.hasta.trim();

  if (!desde || !hasta) {
    mensajeErrorEmergencia.value = "Indica las fechas de inicio y fin de la emergencia.";
    return null;
  }
  if (desde > hasta) {
    mensajeErrorEmergencia.value = "La fecha «Desde» no puede ser posterior a «Hasta».";
    return null;
  }

  const motivo = formularioEmergencia.motivo?.trim();
  return motivo ? { desde, hasta, motivo } : { desde, hasta };
};

const crearEmergenciaDesdeFormulario = async () => {
  if (creandoEmergencia.value) return;
  const dto = validarFormularioEmergencia();
  if (!dto) return;

  const creada = await crearEmergencia(dto);
  if (!creada) return;

  formularioEmergencia.desde = "";
  formularioEmergencia.hasta = "";
  formularioEmergencia.motivo = "";
  mensajeErrorEmergencia.value = "";
  // La emergencia se actualiza en su composable; la agenda necesita su propia recarga.
  await cargarTodo();
};

const formatearRangoEmergencia = (emergencia: BloqueoEmergenciaListItemDto) =>
  `${formatDiaISO(emergencia.desde)} — ${formatDiaISO(emergencia.hasta)}`;

type FiltroEmergencias = "TODAS" | "ACTIVAS" | "RETIRADAS";
const filtroEmergencias = ref<FiltroEmergencias>("TODAS");
const emergenciasExpandidas = ref<Set<number>>(new Set());

const emergenciasVisibles = computed(() => {
  const filtradas = emergencias.value.filter((emergencia) => {
    if (filtroEmergencias.value === "ACTIVAS") return emergencia.activo;
    if (filtroEmergencias.value === "RETIRADAS") return !emergencia.activo;
    return true;
  });

  return [...filtradas].sort(
    (a, b) =>
      Number(b.activo) - Number(a.activo) ||
      a.desde.localeCompare(b.desde) ||
      a.hasta.localeCompare(b.hasta) ||
      a.creado_en.localeCompare(b.creado_en) ||
      a.id - b.id,
  );
});

const emergenciaEstaExpandida = (id: number) => emergenciasExpandidas.value.has(id);

const alternarEmergencia = (id: number) => {
  const siguientes = new Set(emergenciasExpandidas.value);
  if (siguientes.has(id)) siguientes.delete(id);
  else siguientes.add(id);
  emergenciasExpandidas.value = siguientes;
};

// --- Diálogo de bloqueo (crear/eliminar según el día elegido) ---
const dialogAbierto = ref(false);
const diaSeleccionado = ref<DiaISO | null>(null);
const nuevoTipo = ref<TipoBloqueoAgenda>("FERIADO");
const nuevoMotivo = ref("");

const bloqueoDelDia = computed(() =>
  diaSeleccionado.value ? (bloqueosPorFecha.value.get(diaSeleccionado.value) ?? null) : null,
);

const onSeleccionarDia = (dia: DiaISO) => {
  diaSeleccionado.value = dia;
  nuevoTipo.value = "FERIADO";
  nuevoMotivo.value = "";
  dialogAbierto.value = true;

  if (bloqueosPorFecha.value.has(dia)) {
    limpiarImpactoBloqueo();
  } else {
    void consultarImpactoBloqueo(dia);
  }
};

const onTipoBloqueo = (valor: unknown) => {
  if (typeof valor === "string") nuevoTipo.value = valor as TipoBloqueoAgenda;
};

const confirmarCrear = async () => {
  if (!diaSeleccionado.value) return;
  const ok = await crearBloqueo({
    fecha: diaSeleccionado.value,
    tipo: nuevoTipo.value,
    motivo: nuevoMotivo.value.trim() || undefined,
  });
  if (ok) dialogAbierto.value = false;
};

const confirmarEliminar = async () => {
  if (!bloqueoDelDia.value) return;
  const ok = await eliminarBloqueo(bloqueoDelDia.value);
  if (ok) dialogAbierto.value = false;
};

const eliminarDesdeLista = async (bloqueo: BloqueoDto) => {
  await eliminarBloqueo(bloqueo);
};

onMounted(() => {
  void Promise.all([cargarTodo(), cargarEmergencias()]);
});
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-8 p-6">
    <div>
      <h1 class="text-text-page flex items-center gap-2 text-2xl font-bold">
        <CalendarClock class="size-6" />
        Agenda y disponibilidad
      </h1>
      <p class="text-text-page2 mt-1 text-sm">
        Ajusta la capacidad diaria y bloquea días para que no puedan reservarse en el calendario de
        pedidos.
      </p>
    </div>

    <!-- Configuración -->
    <section class="rounded-lg bg-white p-6 shadow ring-1 ring-secondary dark:bg-gray-900">
      <h2 class="text-text-page mb-4 text-lg font-semibold">Configuración</h2>

      <div v-if="cargandoConfig" class="text-text-page2 py-4 text-sm">
        Cargando configuración...
      </div>

      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label for="capacidad">Capacidad diaria (minutos)</Label>
          <Input id="capacidad" v-model.number="form.capacidad_minutos_dia" type="number" min="1" />
          <p class="text-text-page2 text-xs">
            Minutos de trabajo disponibles por día para calcular la capacidad.
          </p>
        </div>

        <div class="space-y-1.5">
          <Label for="anticipacion">Días de anticipación mínima</Label>
          <Input
            id="anticipacion"
            v-model.number="form.dias_anticipacion_min"
            type="number"
            min="0"
          />
          <p class="text-text-page2 text-xs">
            Cuántos días antes, como mínimo, puede pedirse una entrega.
          </p>
        </div>
      </div>

      <div class="mt-4 flex items-center gap-3">
        <Button :disabled="guardandoConfig || cargandoConfig" @click="guardarConfig">
          {{ guardandoConfig ? "Guardando..." : "Guardar configuración" }}
        </Button>
        <span v-if="config" class="text-text-page2 text-xs">
          Estado: {{ config.activo ? "activa" : "inactiva" }}
        </span>
      </div>
    </section>

    <!-- Emergencias -->
    <section class="rounded-lg bg-white p-6 shadow ring-1 ring-secondary dark:bg-gray-900">
      <h2 class="text-text-page mb-1 text-lg font-semibold">Bloqueos de emergencia</h2>
      <p class="text-text-page2 mb-4 text-sm">
        Registra un periodo de emergencia. La lista muestra el estado y los contadores informativos
        disponibles.
      </p>

      <form
        class="space-y-4"
        novalidate
        aria-describedby="emergencia-error"
        @submit.prevent="crearEmergenciaDesdeFormulario"
      >
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="emergencia-desde">Desde</Label>
            <Input
              id="emergencia-desde"
              v-model="formularioEmergencia.desde"
              type="date"
              required
            />
          </div>

          <div class="space-y-1.5">
            <Label for="emergencia-hasta">Hasta</Label>
            <Input
              id="emergencia-hasta"
              v-model="formularioEmergencia.hasta"
              type="date"
              required
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <Label for="emergencia-motivo">Motivo (opcional)</Label>
          <Textarea
            id="emergencia-motivo"
            v-model="formularioEmergencia.motivo"
            placeholder="Describe brevemente la emergencia..."
            maxlength="200"
          />
        </div>

        <p
          v-if="mensajeErrorEmergencia"
          id="emergencia-error"
          class="text-destructive text-sm"
          role="alert"
          aria-live="polite"
        >
          {{ mensajeErrorEmergencia }}
        </p>

        <Button type="submit" :disabled="creandoEmergencia || cargandoEmergencias">
          {{ creandoEmergencia ? "Creando emergencia..." : "Crear emergencia" }}
        </Button>
      </form>

      <div class="mt-8 space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 class="text-text-page text-sm font-semibold">Emergencias registradas</h3>
            <p class="text-text-page2 mt-1 text-xs">
              Las activas aparecen primero y las retiradas al final, ordenadas por fecha.
            </p>
          </div>
          <div class="space-y-1.5 sm:min-w-52">
            <Label for="emergencias-filtro">Filtrar emergencias</Label>
            <select
              id="emergencias-filtro"
              v-model="filtroEmergencias"
              class="border-input bg-background text-text-page focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2"
            >
              <option value="TODAS">Todas (activas primero)</option>
              <option value="ACTIVAS">Solo activas</option>
              <option value="RETIRADAS">Solo retiradas</option>
            </select>
          </div>
        </div>

        <p v-if="cargandoEmergencias" class="text-text-page2 text-sm">Cargando emergencias...</p>
        <p v-else-if="emergencias.length === 0" class="text-text-page2 text-sm">
          No hay emergencias registradas.
        </p>
        <template v-else>
          <ul
            v-if="emergenciasVisibles.length > 0"
            class="divide-y divide-gray-100 dark:divide-gray-800"
          >
            <li
              v-for="emergencia in emergenciasVisibles"
              :key="emergencia.id"
              class="py-4 first:pt-0 last:pb-0"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <RouterLink
                  :to="{ name: 'admin-agenda-emergencia', params: { id: emergencia.id } }"
                  class="text-text-page text-sm font-medium hover:underline"
                >
                  {{ formatearRangoEmergencia(emergencia) }}
                </RouterLink>
                <div class="flex items-center gap-2">
                  <span
                    :class="[
                      'rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                      emergencia.activo
                        ? 'bg-green-100 text-green-800 ring-green-600/20'
                        : 'bg-gray-100 text-gray-800 ring-gray-600/20',
                    ]"
                  >
                    {{ emergencia.activo ? "Activa" : "Retirada" }}
                  </span>
                  <button
                    type="button"
                    class="text-text-page2 rounded-md p-2 transition hover:bg-secondary/30 focus:outline-none focus:ring-2 focus:ring-primary"
                    :aria-expanded="emergenciaEstaExpandida(emergencia.id)"
                    :aria-controls="`emergencia-detalle-${emergencia.id}`"
                    :aria-label="
                      emergenciaEstaExpandida(emergencia.id)
                        ? `Ocultar detalles de ${formatearRangoEmergencia(emergencia)}`
                        : `Mostrar detalles de ${formatearRangoEmergencia(emergencia)}`
                    "
                    @click="alternarEmergencia(emergencia.id)"
                  >
                    <ChevronDown
                      :class="[
                        'size-4 transition-transform',
                        emergenciaEstaExpandida(emergencia.id) ? 'rotate-180' : '',
                      ]"
                    />
                  </button>
                </div>
              </div>

              <div
                v-if="emergenciaEstaExpandida(emergencia.id)"
                :id="`emergencia-detalle-${emergencia.id}`"
                class="mt-3 space-y-3 rounded-md bg-secondary/20 p-3"
              >
                <p v-if="emergencia.motivo" class="text-text-page2 text-sm">
                  <span class="font-medium">Motivo:</span> {{ emergencia.motivo }}
                </p>
                <dl class="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                  <div>
                    <dt class="text-text-page2">Total afectados</dt>
                    <dd class="text-text-page font-semibold">{{ emergencia.total_afectados }}</dd>
                  </div>
                  <div>
                    <dt class="text-text-page2">Pendientes de contacto</dt>
                    <dd class="text-text-page font-semibold">
                      {{ emergencia.pendientes_contacto }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-text-page2">Pendientes de resolución</dt>
                    <dd class="text-text-page font-semibold">
                      {{ emergencia.pendientes_resolucion }}
                    </dd>
                  </div>
                </dl>
                <RouterLink
                  :to="{ name: 'admin-agenda-emergencia', params: { id: emergencia.id } }"
                  class="text-text-page text-sm font-medium underline underline-offset-2"
                >
                  Ver detalle de la emergencia
                </RouterLink>
              </div>
            </li>
          </ul>
          <p v-else class="text-text-page2 text-sm">
            No hay emergencias que coincidan con el filtro seleccionado.
          </p>
        </template>
      </div>
    </section>

    <!-- Bloqueos -->
    <section class="rounded-lg bg-white p-6 shadow ring-1 ring-secondary dark:bg-gray-900">
      <h2 class="text-text-page mb-1 text-lg font-semibold">Días bloqueados</h2>
      <p class="text-text-page2 mb-4 text-sm">
        Haz clic en un día del calendario para bloquearlo o quitar el bloqueo. Los días bloqueados
        aparecen resaltados.
      </p>

      <div class="flex flex-col gap-8 lg:flex-row">
        <DisponibilidadCalendar
          v-model:mes-visible="mesVisible"
          :fecha-seleccionada="diaSeleccionado"
          :dias-resaltados="diasBloqueados"
          @update:fecha-seleccionada="onSeleccionarDia"
        />

        <div class="min-w-0 flex-1">
          <h3 class="text-text-page mb-2 text-sm font-semibold">Bloqueos registrados</h3>
          <p v-if="bloqueosParaLista.length === 0" class="text-text-page2 text-sm">
            No hay días bloqueados.
          </p>
          <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
            <li
              v-for="bloqueo in bloqueosParaLista"
              :key="`${bloqueo.origen}-${bloqueo.id}`"
              class="flex items-center justify-between gap-3 py-2"
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-text-page truncate text-sm font-medium capitalize">
                    {{ formatDiaISO(bloqueo.fecha) }}
                  </p>
                  <span
                    class="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-text-page2"
                  >
                    {{ bloqueo.origen === "MANUAL" ? "Bloqueo manual" : "Emergencia" }}
                  </span>
                </div>
                <p class="text-text-page2 text-xs">
                  {{
                    bloqueo.tipo === "EMERGENCIA" ? "Emergencia" : TIPO_BLOQUEO_LABELS[bloqueo.tipo]
                  }}
                  <RouterLink
                    v-if="bloqueo.emergencia_id"
                    :to="{ name: 'admin-agenda-emergencia', params: { id: bloqueo.emergencia_id } }"
                    class="text-text-page ml-1 font-medium underline underline-offset-2"
                  >
                    Ver detalle
                  </RouterLink>
                  <span v-if="bloqueo.motivo">— {{ bloqueo.motivo }}</span>
                </p>
              </div>
              <Button
                v-if="bloqueo.eliminable_individualmente"
                variant="ghost"
                size="icon"
                :disabled="guardandoBloqueo"
                aria-label="Eliminar bloqueo"
                @click="eliminarDesdeLista(bloqueo)"
              >
                <Trash2 class="size-4 text-destructive" />
              </Button>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Diálogo crear/eliminar bloqueo -->
    <Dialog v-model:open="dialogAbierto">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {{ bloqueoDelDia ? "Quitar bloqueo" : "Bloquear día" }}
          </DialogTitle>
          <DialogDescription v-if="diaSeleccionado" class="capitalize">
            {{ formatDiaISO(diaSeleccionado) }}
          </DialogDescription>
        </DialogHeader>

        <!-- El día ya está bloqueado -> ofrecer eliminarlo -->
        <div v-if="bloqueoDelDia" class="space-y-2">
          <p class="text-text-page text-sm">
            Este día está bloqueado como
            <strong>{{ TIPO_BLOQUEO_LABELS[bloqueoDelDia.tipo] }}</strong>
            <span v-if="bloqueoDelDia.motivo"> ({{ bloqueoDelDia.motivo }})</span>.
          </p>
          <p class="text-text-page2 text-sm">
            Al quitarlo, el día vuelve a estar disponible para pedidos.
          </p>
        </div>

        <!-- El día está libre -> formulario para bloquearlo -->
        <div v-else class="space-y-4">
          <div class="space-y-1.5">
            <Label>Tipo de bloqueo</Label>
            <Select :model-value="nuevoTipo" @update:model-value="onTipoBloqueo">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="tipo in TIPOS" :key="tipo" :value="tipo">
                  {{ TIPO_BLOQUEO_LABELS[tipo] }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label for="bloqueo-motivo">Motivo (opcional)</Label>
            <Textarea
              id="bloqueo-motivo"
              v-model="nuevoMotivo"
              placeholder="Ej. Navidad, viaje, día completo..."
              maxlength="200"
            />
          </div>

          <p v-if="cargandoImpactoBloqueo" class="text-text-page2 text-xs" aria-live="polite">
            Revisando pedidos para esta fecha...
          </p>
          <p
            v-else-if="errorImpactoBloqueo"
            class="text-destructive text-xs"
            role="alert"
            aria-live="polite"
          >
            No se pudo verificar si hay clientes afectados: {{ errorImpactoBloqueo }}
          </p>
          <div
            v-else-if="impactoBloqueo && impactoBloqueo.clientes_unicos_afectados > 0"
            class="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-950"
            role="status"
            aria-live="polite"
          >
            <p class="text-sm font-medium">
              Este bloqueo afectaría a
              {{ impactoBloqueo.clientes_unicos_afectados }}
              {{ impactoBloqueo.clientes_unicos_afectados === 1 ? "cliente" : "clientes" }}.
            </p>
            <p class="mt-1 text-xs">
              Hay {{ impactoBloqueo.total_pedidos_afectados }}
              {{ impactoBloqueo.total_pedidos_afectados === 1 ? "pedido" : "pedidos" }} con entrega
              acordada para este día.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="guardandoBloqueo" @click="dialogAbierto = false">
            Cancelar
          </Button>
          <Button
            v-if="bloqueoDelDia"
            variant="destructive"
            :disabled="guardandoBloqueo"
            @click="confirmarEliminar"
          >
            {{ guardandoBloqueo ? "Quitando..." : "Quitar bloqueo" }}
          </Button>
          <Button
            v-else
            :disabled="guardandoBloqueo || cargandoImpactoBloqueo"
            @click="confirmarCrear"
          >
            {{
              guardandoBloqueo
                ? "Bloqueando..."
                : cargandoImpactoBloqueo
                  ? "Revisando pedidos..."
                  : "Bloquear día"
            }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
