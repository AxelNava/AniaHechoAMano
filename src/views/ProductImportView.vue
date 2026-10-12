<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useProductImport } from "@/composables/products/useProductImport";

const MAX_VISIBLE_ERRORS = 20;

const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const {
  file,
  previewResult,
  confirmation,
  error,
  loading,
  busyAction,
  canConfirm,
  selectFile,
  preview,
  confirm,
  downloadTemplate,
  clear,
} = useProductImport();

const isPreviewing = computed(() => busyAction.value === "preview");
const isConfirming = computed(() => busyAction.value === "confirm");
const isDownloading = computed(() => busyAction.value === "download");

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileDescription = computed(() => {
  if (!file.value) return "Ningún archivo seleccionado";
  return `${file.value.name} · ${formatFileSize(file.value.size)}`;
});

const summaryRows = computed(() => {
  const summary = previewResult.value?.resumen;
  if (!summary) return [];

  return [
    { key: "categorias", label: "Categorías", ...summary.categorias },
    { key: "etiquetas", label: "Etiquetas", ...summary.etiquetas },
    { key: "componentes", label: "Componentes", ...summary.componentes },
    { key: "productos", label: "Productos", ...summary.productos },
  ];
});

const visibleErrors = computed(() =>
  previewResult.value?.errores.slice(0, MAX_VISIBLE_ERRORS) ?? [],
);

const hiddenErrorCount = computed(() =>
  Math.max((previewResult.value?.errores.length ?? 0) - visibleErrors.value.length, 0),
);

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const selectedFile = input.files?.[0] ?? null;
  if (!selectFile(selectedFile)) input.value = "";
};

const openFilePicker = () => fileInput.value?.click();

const clearImport = () => {
  clear();
  if (fileInput.value) fileInput.value.value = "";
};
</script>

<template>
  <main class="mx-auto max-w-5xl p-4 sm:p-6">
    <section class="space-y-6 rounded-xl bg-white p-5 shadow-sm sm:p-6">
      <header class="flex flex-col gap-3 border-b border-gray-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-sm font-medium text-blue-600">Administración de productos</p>
          <h1 class="mt-1 text-2xl font-bold text-gray-900">Importar catálogo</h1>
          <p class="mt-2 max-w-2xl text-sm text-gray-600">
            Valida el archivo XLSX antes de aplicar cambios. La confirmación vuelve a enviar el mismo
            archivo previsualizado.
          </p>
        </div>
        <button
          type="button"
          :disabled="loading"
          class="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="downloadTemplate"
        >
          {{ isDownloading ? "Descargando..." : "Descargar plantilla" }}
        </button>
      </header>

      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.7fr)]">
        <section aria-labelledby="archivo-heading" class="space-y-4">
          <div>
            <h2 id="archivo-heading" class="text-base font-semibold text-gray-900">Archivo XLSX</h2>
            <p class="mt-1 text-sm text-gray-600">
              Selecciona la plantilla completada. El tamaño máximo admitido es 10 MB.
            </p>
          </div>

          <input
            id="archivo-importacion"
            ref="fileInput"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            class="sr-only"
            :disabled="loading"
            @change="onFileChange"
          />
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              :disabled="loading"
              class="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              @click="openFilePicker"
            >
              Elegir archivo
            </button>
            <span class="min-w-0 break-all text-sm text-gray-600" aria-live="polite">
              {{ fileDescription }}
            </span>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              :disabled="!file || loading"
              :aria-busy="isPreviewing"
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="preview"
            >
              {{ isPreviewing ? "Previsualizando..." : "Previsualizar" }}
            </button>
            <button
              type="button"
              :disabled="!canConfirm || loading"
              :aria-busy="isConfirming"
              class="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="confirm"
            >
              {{ isConfirming ? "Confirmando..." : "Confirmar importación" }}
            </button>
            <button
              v-if="file || previewResult || error"
              type="button"
              :disabled="loading"
              class="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              @click="clearImport"
            >
              Limpiar
            </button>
          </div>
        </section>

        <aside aria-labelledby="instrucciones-heading" class="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h2 id="instrucciones-heading" class="text-sm font-semibold text-blue-950">Instrucciones</h2>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-blue-950">
            <li>Completa las hojas Productos, Componentes, ProductoComponentes, Categorias y Etiquetas.</li>
            <li>Las claves estables determinan si un registro se crea o se actualiza.</li>
            <li>Separa varias etiquetas en <code class="rounded bg-blue-100 px-1">etiquetas_clave</code> con punto y coma.</li>
            <li>Usa TRUE o FALSE en los campos booleanos.</li>
            <li>Esta versión no importa imágenes y no modifica las imágenes existentes.</li>
          </ul>
        </aside>
      </div>

      <div v-if="error" role="alert" aria-live="assertive" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        {{ error }}
      </div>

      <section v-if="previewResult" aria-labelledby="preview-heading" class="space-y-4 border-t border-gray-200 pt-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="preview-heading" class="text-lg font-semibold text-gray-900">Resultado de la previsualización</h2>
            <p class="mt-1 break-all text-xs text-gray-500">SHA-256: {{ previewResult.sha256 }}</p>
          </div>
          <p
            class="rounded-full px-3 py-1 text-sm font-semibold"
            :class="previewResult.valido ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
          >
            {{ previewResult.valido ? "Archivo válido" : "Hay errores que corregir" }}
          </p>
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <div
            v-for="row in summaryRows"
            :key="row.key"
            class="rounded-md border border-gray-200 bg-gray-50 p-3"
          >
            <div class="flex items-center justify-between gap-2 text-sm font-semibold text-gray-800">
              <span>{{ row.label }}</span>
              <span>{{ row.total }} total</span>
            </div>
            <p class="mt-1 text-xs text-gray-600">{{ row.crear }} crear · {{ row.actualizar }} actualizar</p>
          </div>
        </div>

        <p class="text-sm text-gray-600">
          Relaciones: {{ previewResult.resumen.relaciones.componentes }} de componentes ·
          {{ previewResult.resumen.relaciones.etiquetas }} de etiquetas.
        </p>

        <section v-if="previewResult.errores.length" aria-labelledby="errores-heading" class="rounded-md border border-amber-200 bg-amber-50 p-4">
          <h3 id="errores-heading" class="text-sm font-semibold text-amber-950">
            Errores por fila ({{ previewResult.errores.length }})
          </h3>
          <ul class="mt-2 max-h-80 space-y-2 overflow-y-auto text-sm text-amber-950">
            <li v-for="(item, index) in visibleErrors" :key="`${item.hoja}-${item.fila}-${item.campo}-${index}`">
              <span class="font-medium">{{ item.hoja }}, fila {{ item.fila }}, {{ item.campo }}:</span>
              {{ item.mensaje }}
            </li>
          </ul>
          <p v-if="hiddenErrorCount" class="mt-3 text-xs font-medium text-amber-800">
            Se muestran {{ visibleErrors.length }} errores; hay {{ hiddenErrorCount }} adicionales.
          </p>
        </section>
      </section>

      <section v-if="confirmation" role="status" aria-live="polite" class="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <h2 class="font-semibold">Importación confirmada</h2>
        <p class="mt-1">Se aplicaron los cambios del archivo con SHA-256 {{ confirmation.sha256 }}.</p>
      </section>
    </section>
  </main>
</template>
