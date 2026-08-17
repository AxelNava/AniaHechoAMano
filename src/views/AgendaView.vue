<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { CalendarClock, Trash2 } from "lucide-vue-next";
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
import { formatDiaISO } from "@/utils/orderDisplay";
import type { BloqueoDto, TipoBloqueoAgenda } from "@/types/disponibilidad/agendaDto";
import type { DiaISO } from "@/components/ui/calendar";

const {
  config,
  form,
  cargandoConfig,
  guardandoConfig,
  guardarConfig,
  mesVisible,
  bloqueos,
  bloqueosPorFecha,
  diasBloqueados,
  guardandoBloqueo,
  crearBloqueo,
  eliminarBloqueo,
  cargarTodo,
} = useAgenda();

const TIPOS: TipoBloqueoAgenda[] = ["FERIADO", "PERSONAL", "OCUPADO"];

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

onMounted(cargarTodo);
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
          <p v-if="bloqueos.length === 0" class="text-text-page2 text-sm">
            No hay días bloqueados.
          </p>
          <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
            <li
              v-for="bloqueo in bloqueos"
              :key="`${bloqueo.origen}-${bloqueo.id}`"
              class="flex items-center justify-between gap-3 py-2"
            >
              <div class="min-w-0">
                <p class="text-text-page truncate text-sm font-medium capitalize">
                  {{ formatDiaISO(bloqueo.fecha) }}
                </p>
                <p class="text-text-page2 text-xs">
                  {{ TIPO_BLOQUEO_LABELS[bloqueo.tipo] }}
                  <span v-if="bloqueo.motivo">— {{ bloqueo.motivo }}</span>
                </p>
              </div>
              <Button
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
          <Button v-else :disabled="guardandoBloqueo" @click="confirmarCrear">
            {{ guardandoBloqueo ? "Bloqueando..." : "Bloquear día" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
