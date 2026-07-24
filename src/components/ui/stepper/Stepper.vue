<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cva } from 'class-variance-authority'
import { Check } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import type { EstadoPaso, StepperPaso } from './types'

const props = withDefaults(
  defineProps<{
    /** Lista ordenada de pasos (título + descripción opcional). */
    pasos: StepperPaso[]
    /** Paso activo, 1-based. */
    pasoActual: number
    /** Si es true, permite hacer clic en pasos ya completados para retroceder. */
    navegable?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    navegable: false,
  },
)

const emit = defineEmits<{
  (e: 'seleccionar-paso', paso: number): void
}>()

const pasosConEstado = computed(() =>
  props.pasos.map((paso, indice) => {
    const numero = indice + 1
    let estado: EstadoPaso = 'pendiente'
    if (numero < props.pasoActual) estado = 'completado'
    else if (numero === props.pasoActual) estado = 'activo'

    return { ...paso, numero, estado }
  }),
)

const circuloVariants = cva(
  'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors',
  {
    variants: {
      estado: {
        completado: 'border-primary bg-primary text-primary-foreground',
        activo: 'border-primary text-primary',
        pendiente: 'border-input text-muted-foreground',
      },
    },
    defaultVariants: {
      estado: 'pendiente',
    },
  },
)

function esNavegable(estado: EstadoPaso): boolean {
  return props.navegable && estado === 'completado'
}

function alSeleccionar(numero: number, estado: EstadoPaso) {
  if (!esNavegable(estado)) return
  emit('seleccionar-paso', numero)
}
</script>

<template>
  <ol :class="cn('flex w-full items-center', props.class)">
    <li
      v-for="(paso, indice) in pasosConEstado"
      :key="paso.numero"
      class="flex items-center"
      :class="indice < pasosConEstado.length - 1 ? 'flex-1' : ''"
    >
      <component
        :is="esNavegable(paso.estado) ? 'button' : 'div'"
        :type="esNavegable(paso.estado) ? 'button' : undefined"
        class="flex items-center gap-2 text-left"
        :class="esNavegable(paso.estado) ? 'cursor-pointer' : ''"
        :aria-current="paso.estado === 'activo' ? 'step' : undefined"
        @click="alSeleccionar(paso.numero, paso.estado)"
      >
        <span :class="circuloVariants({ estado: paso.estado })">
          <Check v-if="paso.estado === 'completado'" class="size-4" />
          <template v-else>{{ paso.numero }}</template>
        </span>
        <span class="hidden flex-col sm:flex">
          <span
            class="text-sm font-medium"
            :class="paso.estado === 'pendiente' ? 'text-muted-foreground' : 'text-foreground'"
          >
            {{ paso.titulo }}
          </span>
          <span v-if="paso.descripcion" class="text-muted-foreground text-xs">
            {{ paso.descripcion }}
          </span>
        </span>
      </component>

      <span
        v-if="indice < pasosConEstado.length - 1"
        class="mx-2 h-px flex-1 transition-colors"
        :class="paso.estado === 'completado' ? 'bg-primary' : 'bg-border'"
      />
    </li>
  </ol>
</template>
