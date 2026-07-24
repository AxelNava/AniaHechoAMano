<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  nombreCopiaComponente,
  useProductComponents,
  type DatosEdicionComponente,
} from "@/composables/products/useProductComponents";
import { useComponentsStore } from "@/stores/componentsStore";
import type { ComponentsDto } from "@/types/products/ComponentsDto";

const props = withDefaults(
  defineProps<{
    nombreProducto: string;
    disabled?: boolean;
    titulo?: string;
    subtitulo?: string;
  }>(),
  {
    disabled: false,
    titulo: "Componentes del producto",
    subtitulo: "Define la receta: qué componentes lleva el producto y en qué cantidad.",
  },
);

// El modelo contiene SOLO filas válidas (componente elegido y cantidad > 0).
const model = defineModel<ComponentsDto[]>({ default: [] });

const componentsStore = useComponentsStore();
const { components: componentesDisponibles, isLoading } = storeToRefs(componentsStore);

const {
  filas,
  recetaValida,
  guardando,
  setReceta,
  agregarFila,
  quitarFila,
  seleccionarComponente,
  crearCopiaParaProducto,
  editarComponenteGlobal,
} = useProductComponents();

// Firma de la receta para evitar bucles en la sincronización modelo↔filas.
const firmaReceta = (items: ComponentsDto[]) =>
  items.map((item) => `${item.componente_id}:${item.cantidad}`).join("|");

const syncSignature = shallowRef("");

watch(
  model,
  (nextReceta) => {
    const nextFirma = firmaReceta(nextReceta);
    if (nextFirma === syncSignature.value) return;

    syncSignature.value = nextFirma;
    setReceta(nextReceta);
  },
  { immediate: true, deep: true },
);

watch(
  filas,
  () => {
    const nextFirma = firmaReceta(recetaValida.value);
    if (nextFirma === syncSignature.value) return;

    syncSignature.value = nextFirma;
    model.value = recetaValida.value;
  },
  { deep: true },
);

onMounted(() => {
  // Idempotente: el store no repite el fetch si ya está cargado (`isFetched`).
  componentsStore.fetchComponents();
});

const componentePorId = computed(
  () => new Map(componentesDisponibles.value.map((componente) => [componente.id, componente])),
);

const hayFilas = computed(() => filas.value.length > 0);

const estaUsadoEnOtraFila = (id: number, index: number) =>
  filas.value.some((fila, filaIndex) => filaIndex !== index && fila.componente_id === id);

const esFilaNoDisponible = (componenteId: number | null) =>
  componenteId !== null && !componentePorId.value.has(componenteId);

const puedeEditarFila = (componenteId: number | null) =>
  componenteId !== null && componentePorId.value.has(componenteId);

const onSeleccionComponente = (index: number, event: Event) => {
  const select = event.target as HTMLSelectElement;
  const id = Number(select.value);
  const fila = filas.value[index];

  if (!Number.isFinite(id) || !seleccionarComponente(index, id)) {
    // Revertir el valor visual del select al estado real de la fila.
    select.value = fila && fila.componente_id !== null ? String(fila.componente_id) : "";
  }
};

// ---- Modal de edición del componente (2 pasos en un mismo Dialog) ----
const modalAbierta = shallowRef(false);
const pasoModal = shallowRef<"formulario" | "confirmacion">("formulario");
const indiceEdicion = shallowRef<number | null>(null);
const datosEdicion = ref<DatosEdicionComponente>({
  nombre: "",
  tipo: "",
  descripcion: "",
  unidad_medida: "",
  requiere_pedido_previo: false,
});

const formularioValido = computed(
  () =>
    datosEdicion.value.nombre.trim() !== "" &&
    datosEdicion.value.tipo !== "" &&
    datosEdicion.value.unidad_medida.trim() !== "",
);

// Nombre que tendría la copia: SIEMPRE a partir del nombre original del store,
// aunque el usuario haya editado el campo nombre en el formulario.
const nombreCopiaPrevisto = computed(() => {
  if (indiceEdicion.value === null) return "";

  const fila = filas.value[indiceEdicion.value];
  if (!fila || fila.componente_id === null) return "";

  const original = componentePorId.value.get(fila.componente_id);
  if (!original) return "";

  return nombreCopiaComponente(original.nombre, props.nombreProducto);
});

const abrirEdicion = (index: number) => {
  const fila = filas.value[index];
  if (!fila || fila.componente_id === null) return;

  const componente = componentePorId.value.get(fila.componente_id);
  if (!componente) return;

  datosEdicion.value = {
    nombre: componente.nombre,
    tipo: componente.tipo,
    descripcion: componente.descripcion ?? "",
    unidad_medida: componente.unidad_medida,
    requiere_pedido_previo: componente.requiere_pedido_previo ?? false,
  };
  indiceEdicion.value = index;
  pasoModal.value = "formulario";
  modalAbierta.value = true;
};

const cerrarModal = () => {
  if (guardando.value) return;
  modalAbierta.value = false;
};

const onOpenChange = (abierto: boolean) => {
  if (!abierto) cerrarModal();
};

const continuarEdicion = () => {
  if (!formularioValido.value) return;
  pasoModal.value = "confirmacion";
};

const confirmarCopia = async () => {
  if (indiceEdicion.value === null) return;

  const exito = await crearCopiaParaProducto(
    indiceEdicion.value,
    datosEdicion.value,
    props.nombreProducto,
  );
  if (exito) modalAbierta.value = false;
};

const confirmarGlobal = async () => {
  if (indiceEdicion.value === null) return;

  const exito = await editarComponenteGlobal(indiceEdicion.value, datosEdicion.value);
  if (exito) modalAbierta.value = false;
};
</script>

<template>
  <section
    :aria-label="titulo"
    class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
  >
    <div class="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold text-gray-800">{{ titulo }}</h2>
        <p class="mt-1 text-sm text-gray-500">{{ subtitulo }}</p>
      </div>
      <button
        type="button"
        aria-label="Añadir componente"
        :disabled="disabled"
        class="shrink-0 rounded-md bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        @click="agregarFila"
      >
        + Añadir componente
      </button>
    </div>

    <p v-if="isLoading" class="text-sm text-gray-500">Cargando componentes...</p>

    <p v-else-if="!hayFilas" class="text-sm text-gray-500 italic">
      No hay componentes en la receta.
    </p>

    <div v-else class="space-y-3">
      <div v-for="(fila, index) in filas" :key="fila.uid" class="flex items-start gap-2">
        <span
          v-if="esFilaNoDisponible(fila.componente_id)"
          class="flex-1 rounded-md border border-gray-200 bg-gray-50 p-2 text-sm text-gray-400"
        >
          Componente #{{ fila.componente_id }} (no disponible)
        </span>
        <select
          v-else
          :aria-label="`Componente de la fila ${index + 1}`"
          :disabled="disabled"
          class="flex-1 border border-gray-300 rounded-md p-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          required
          @change="onSeleccionComponente(index, $event)"
        >
          <option value="" disabled :selected="fila.componente_id === null">
            Selecciona un componente
          </option>
          <option
            v-for="componente in componentesDisponibles"
            :key="componente.id"
            :value="componente.id"
            :selected="componente.id === fila.componente_id"
            :disabled="estaUsadoEnOtraFila(componente.id, index)"
          >
            {{ componente.nombre }} ({{ componente.unidad_medida }})
          </option>
        </select>

        <input
          v-model.number="fila.cantidad"
          type="number"
          min="0.01"
          step="0.01"
          required
          aria-label="Cantidad"
          placeholder="Cant."
          :disabled="disabled"
          class="w-24 border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />

        <button
          type="button"
          :disabled="disabled || !puedeEditarFila(fila.componente_id)"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          @click="abrirEdicion(index)"
        >
          Editar
        </button>
        <button
          type="button"
          :disabled="disabled"
          class="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          @click="quitarFila(index)"
        >
          Quitar
        </button>
      </div>
    </div>

    <Dialog :open="modalAbierta" @update:open="onOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto">
        <template v-if="pasoModal === 'formulario'">
          <DialogHeader>
            <DialogTitle>Editar componente</DialogTitle>
            <DialogDescription>
              Ajusta los datos del componente. En el siguiente paso decidirás cómo aplicar los
              cambios.
            </DialogDescription>
          </DialogHeader>

          <div class="space-y-4">
            <div>
              <label
                for="edicion-componente-nombre"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombre *
              </label>
              <input
                id="edicion-componente-nombre"
                v-model="datosEdicion.nombre"
                class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: Papel Crepé"
              />
            </div>
            <div>
              <label
                for="edicion-componente-tipo"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Tipo *
              </label>
              <select
                id="edicion-componente-tipo"
                v-model="datosEdicion.tipo"
                class="w-full border border-gray-300 rounded-md p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="" disabled>Selecciona el tipo</option>
                <option value="MATERIAL">Material / Materia Prima</option>
                <option value="ELEMENTO_ELABORADO">Elemento Pre-elaborado</option>
                <option value="SERVICIO">Servicio (Corte, Sublimado, etc.)</option>
              </select>
            </div>
            <div>
              <label
                for="edicion-componente-unidad"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Tipo de Medición (Unidad) *
              </label>
              <input
                id="edicion-componente-unidad"
                v-model="datosEdicion.unidad_medida"
                class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: pliego, metro, pieza, tubo"
              />
            </div>
            <div>
              <label
                for="edicion-componente-descripcion"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Descripción
              </label>
              <textarea
                id="edicion-componente-descripcion"
                v-model="datosEdicion.descripcion"
                rows="2"
                class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Descripción opcional"
              ></textarea>
            </div>
            <div class="flex items-center gap-2 pt-1">
              <input
                id="edicion-componente-pedido-previo"
                v-model="datosEdicion.requiere_pedido_previo"
                type="checkbox"
                class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <label
                for="edicion-componente-pedido-previo"
                class="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Requiere pedido previo a proveedor
              </label>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded transition-colors cursor-pointer"
              @click="cerrarModal"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="!formularioValido"
              class="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              @click="continuarEdicion"
            >
              Continuar
            </button>
          </DialogFooter>
        </template>

        <template v-else>
          <DialogHeader>
            <DialogTitle>¿Cómo aplicar los cambios?</DialogTitle>
            <DialogDescription>
              Este componente puede usarse en otros productos. Puedes crear una copia exclusiva
              para este producto (se llamaría "{{ nombreCopiaPrevisto }}") o editar el componente
              global.
            </DialogDescription>
          </DialogHeader>

          <p class="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            Editar el componente global afecta a todos los productos que lo usan.
          </p>

          <DialogFooter class="sm:flex-col sm:space-x-0 gap-2">
            <button
              type="button"
              :disabled="guardando"
              class="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              @click="confirmarCopia"
            >
              {{ guardando ? "Guardando..." : "Crear copia para este producto" }}
            </button>
            <button
              type="button"
              :disabled="guardando"
              class="w-full px-4 py-2 border border-amber-300 bg-white text-amber-700 font-medium rounded hover:bg-amber-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              @click="confirmarGlobal"
            >
              {{ guardando ? "Guardando..." : "Editar componente global" }}
            </button>
            <button
              type="button"
              :disabled="guardando"
              class="w-full px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              @click="cerrarModal"
            >
              Cancelar
            </button>
          </DialogFooter>
        </template>
      </DialogContent>
    </Dialog>
  </section>
</template>
