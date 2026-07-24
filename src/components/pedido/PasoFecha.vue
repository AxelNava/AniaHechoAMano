<script setup lang="ts">
import { watch } from "vue";
import { DisponibilidadCalendar } from "@/components/ui/calendar";
import { usePedidoCliente } from "@/composables/pedido/usePedidoCliente";
import { useDisponibilidad } from "@/composables/pedido/useDisponibilidad";
import { formatDiaISO } from "@/utils/orderDisplay";

// Paso "Fecha" (solo pedidos 100% fijos). Alimenta el DisponibilidadCalendar
// controlado con la disponibilidad real y evalúa la fecha elegida.
const { fechaSolicitada, minutosTotales } = usePedidoCliente();

const {
  mesVisible,
  minFecha,
  diasDisponibles,
  diasDeshabilitados,
  cargandoMes,
  evaluacion,
  evaluando,
  evaluarFecha,
} = useDisponibilidad(minutosTotales);

// Reevalúa la fecha (motivos/sugerencias) cada vez que cambia la selección.
watch(fechaSolicitada, (fecha) => void evaluarFecha(fecha), { immediate: true });

const seleccionarSugerencia = (dia: string) => {
  fechaSolicitada.value = dia;
};
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-text-page text-lg font-semibold">¿Para cuándo la quieres?</h2>
      <p class="text-text-page2 text-sm">
        Solo puedes elegir días con disponibilidad. La fecha se confirma cuando
        aceptamos el pedido.
      </p>
    </div>

    <div class="flex flex-col items-start gap-6 md:flex-row">
      <div class="relative">
        <DisponibilidadCalendar
          v-model:mes-visible="mesVisible"
          v-model:fecha-seleccionada="fechaSolicitada"
          :dias-disponibles="diasDisponibles"
          :dias-deshabilitados="diasDeshabilitados"
          :min-fecha="minFecha"
        />
        <div
          v-if="cargandoMes"
          class="bg-background/60 absolute inset-0 flex items-center justify-center rounded-md text-sm"
          role="status"
        >
          Cargando disponibilidad...
        </div>
      </div>

      <div class="min-w-0 flex-1 space-y-3">
        <div
          v-if="fechaSolicitada"
          class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
        >
          <p class="text-text-page2 text-xs uppercase tracking-wide">Fecha elegida</p>
          <p class="text-text-page font-medium capitalize">{{ formatDiaISO(fechaSolicitada) }}</p>

          <p v-if="evaluando" class="text-text-page2 mt-2 text-sm">Revisando disponibilidad...</p>

          <div v-else-if="evaluacion && !evaluacion.disponible" class="mt-2 space-y-2">
            <p class="text-sm font-medium text-red-600">Ese día ya no está disponible.</p>
            <ul v-if="evaluacion.motivos.length" class="text-text-page2 list-disc pl-4 text-xs">
              <li v-for="(motivo, i) in evaluacion.motivos" :key="i">{{ motivo }}</li>
            </ul>
            <div v-if="evaluacion.sugerencias.length" class="space-y-1">
              <p class="text-text-page2 text-xs">Fechas cercanas disponibles:</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="dia in evaluacion.sugerencias"
                  :key="dia"
                  type="button"
                  class="bg-primary/15 text-text-page hover:bg-primary/30 rounded-md px-2 py-1 text-xs font-medium transition-colors"
                  @click="seleccionarSugerencia(dia)"
                >
                  {{ formatDiaISO(dia) }}
                </button>
              </div>
            </div>
          </div>

          <p v-else-if="evaluacion?.disponible" class="mt-2 text-sm font-medium text-green-600">
            ¡Disponible! Continúa para revisar el resumen.
          </p>
        </div>

        <p v-else class="text-text-page2 text-sm">
          Selecciona un día resaltado en el calendario.
        </p>
      </div>
    </div>
  </div>
</template>
