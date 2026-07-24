<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cva } from 'class-variance-authority'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { Button } from '../button'
import type { CeldaDia, DiaISO, MesISO } from './types'

/**
 * Calendario mensual PRESENTACIONAL y CONTROLADO.
 *
 * No conoce el API ni el composable `useDisponibilidad` (Fase 5). El padre le
 * pasa el mes visible, la disponibilidad de los días y la selección; el
 * componente solo pinta el grid y emite navegación/selección.
 *
 * Reglas de selección (un día es seleccionable si se cumplen todas):
 *  - `minFecha` no definida, o el día es >= `minFecha`.
 *  - `diasDisponibles` no definida (lista blanca opcional), o incluye el día.
 *  - `diasDeshabilitados` no incluye el día (lista negra).
 *
 * Ambos `mesVisible` y `fechaSeleccionada` soportan `v-model`.
 */
const props = defineProps<{
  /** Mes visible, formato `YYYY-MM`. Soporta `v-model:mesVisible`. */
  mesVisible: MesISO
  /** Día seleccionado `YYYY-MM-DD` o null. Soporta `v-model:fechaSeleccionada`. */
  fechaSeleccionada?: DiaISO | null
  /** Lista blanca opcional: si se provee, SOLO estos días son seleccionables. */
  diasDisponibles?: DiaISO[]
  /** Lista negra: estos días quedan deshabilitados aunque estén disponibles. */
  diasDeshabilitados?: DiaISO[]
  /**
   * Marca visual (opcional): estos días se pintan distinto pero SIGUEN siendo
   * seleccionables (p.ej. días bloqueados en la agenda del admin, donde el clic
   * abre el diálogo para eliminar el bloqueo). No confundir con
   * `diasDeshabilitados`, que sí impide la selección.
   */
  diasResaltados?: DiaISO[]
  /** Día mínimo seleccionable `YYYY-MM-DD` (p.ej. lead time). */
  minFecha?: DiaISO
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  (e: 'update:mesVisible', mes: MesISO): void
  (e: 'update:fechaSeleccionada', dia: DiaISO): void
}>()

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

const ahora = new Date()
const isoHoy = `${ahora.getFullYear()}-${pad2(ahora.getMonth() + 1)}-${pad2(ahora.getDate())}`

const partesMes = computed(() => {
  const [anio, mes] = props.mesVisible.split('-').map(Number)

  return { anio, mes: (mes || 1) - 1 } // mes 0-based para Date
})

const etiquetaMes = computed(() => `${MESES[partesMes.value.mes]} ${partesMes.value.anio}`)

function esSeleccionable(iso: DiaISO): boolean {
  if (props.minFecha && iso < props.minFecha) return false
  if (props.diasDisponibles && !props.diasDisponibles.includes(iso)) return false
  if (props.diasDeshabilitados?.includes(iso)) return false

  return true
}

const celdas = computed(() => {
  const { anio, mes } = partesMes.value
  const primerDiaSemana = new Date(anio, mes, 1).getDay() // 0=Dom
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()

  const resultado: { clave: string; dia: CeldaDia | null }[] = []

  for (let i = 0; i < primerDiaSemana; i++) {
    resultado.push({ clave: `vacio-inicio-${i}`, dia: null })
  }

  for (let d = 1; d <= diasEnMes; d++) {
    const iso = `${anio}-${pad2(mes + 1)}-${pad2(d)}`
    resultado.push({
      clave: iso,
      dia: {
        iso,
        dia: d,
        seleccionable: esSeleccionable(iso),
        seleccionado: props.fechaSeleccionada === iso,
        esHoy: iso === isoHoy,
        resaltado: props.diasResaltados?.includes(iso) ?? false,
      },
    })
  }

  let relleno = 0
  while (resultado.length % 7 !== 0) {
    resultado.push({ clave: `vacio-fin-${relleno++}`, dia: null })
  }

  return resultado
})

const diaVariants = cva(
  'mx-auto flex size-9 items-center justify-center rounded-md text-sm transition-colors',
  {
    variants: {
      estado: {
        normal: 'text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer',
        seleccionado: 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer font-semibold',
        deshabilitado: 'text-muted-foreground/40 line-through cursor-not-allowed',
      },
    },
    defaultVariants: {
      estado: 'normal',
    },
  },
)

function estadoCelda(dia: CeldaDia): 'normal' | 'seleccionado' | 'deshabilitado' {
  if (!dia.seleccionable) return 'deshabilitado'
  if (dia.seleccionado) return 'seleccionado'

  return 'normal'
}

function irAMes(delta: number) {
  const { anio, mes } = partesMes.value
  const destino = new Date(anio, mes + delta, 1)
  emit('update:mesVisible', `${destino.getFullYear()}-${pad2(destino.getMonth() + 1)}`)
}

function seleccionar(dia: CeldaDia) {
  if (!dia.seleccionable) return
  emit('update:fechaSeleccionada', dia.iso)
}
</script>

<template>
  <div :class="cn('w-full max-w-xs select-none', props.class)">
    <div class="mb-3 flex items-center justify-between">
      <Button type="button" variant="ghost" size="icon" aria-label="Mes anterior" @click="irAMes(-1)">
        <ChevronLeft class="size-4" />
      </Button>
      <span class="text-sm font-medium capitalize">{{ etiquetaMes }}</span>
      <Button type="button" variant="ghost" size="icon" aria-label="Mes siguiente" @click="irAMes(1)">
        <ChevronRight class="size-4" />
      </Button>
    </div>

    <div class="mb-1 grid grid-cols-7 gap-1">
      <span
        v-for="etiqueta in DIAS_SEMANA"
        :key="etiqueta"
        class="text-muted-foreground text-center text-xs font-medium"
      >
        {{ etiqueta }}
      </span>
    </div>

    <div class="grid grid-cols-7 gap-1">
      <template v-for="celda in celdas" :key="celda.clave">
        <div v-if="!celda.dia" />
        <button
          v-else
          type="button"
          :disabled="!celda.dia.seleccionable"
          :aria-pressed="celda.dia.seleccionado"
          :aria-label="celda.dia.iso"
          :class="[
            diaVariants({ estado: estadoCelda(celda.dia) }),
            celda.dia.esHoy && celda.dia.seleccionable && !celda.dia.seleccionado
              ? 'ring-ring ring-1'
              : '',
            celda.dia.resaltado && !celda.dia.seleccionado
              ? 'bg-destructive/10 text-destructive ring-destructive/60 font-medium ring-1'
              : '',
          ]"
          @click="seleccionar(celda.dia)"
        >
          {{ celda.dia.dia }}
        </button>
      </template>
    </div>
  </div>
</template>
