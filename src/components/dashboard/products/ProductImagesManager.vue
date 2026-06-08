<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from "vue";
import { useProductImages } from "@/composables/products/useProductImages";
import type { ProductImageItem } from "@/types/products/ProductDto";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const model = defineModel<ProductImageItem[]>({ default: [] });

const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const draggedIndex = shallowRef<number | null>(null);
const syncSignature = shallowRef("");

const { images, setImages, addImages, replaceImage, removeImage, moveImage } = useProductImages();

const imageSignature = (items: ProductImageItem[]) =>
  items
    .map((item) => `${item.id}:${item.orden}:${item.previewUrl}:${item.file?.name ?? ""}`)
    .join("|");

watch(
  model,
  (nextImages) => {
    const nextSignature = imageSignature(nextImages);
    if (nextSignature === syncSignature.value) return;

    syncSignature.value = nextSignature;
    setImages(nextImages);
  },
  { immediate: true, deep: true },
);

watch(
  images,
  (nextImages) => {
    const nextSignature = imageSignature(nextImages);
    if (nextSignature === syncSignature.value) return;

    syncSignature.value = nextSignature;
    model.value = nextImages;
  },
  { deep: true },
);

const hasImages = computed(() => images.value.length > 0);

const openFilePicker = () => {
  if (props.disabled) return;
  fileInput.value?.click();
};

const handleFilesSelected = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    addImages(input.files);
  }
  input.value = "";
};

const handleReplaceSelected = (event: Event, index: number) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    replaceImage(index, file);
  }
  input.value = "";
};

const handleDragStart = (index: number) => {
  if (props.disabled) return;
  draggedIndex.value = index;
};

const handleDrop = (index: number) => {
  if (props.disabled || draggedIndex.value === null) return;
  moveImage(draggedIndex.value, index);
  draggedIndex.value = null;
};

const handleDragEnd = () => {
  draggedIndex.value = null;
};
</script>

<template>
  <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div class="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold text-gray-800">Imágenes del producto</h2>
        <p class="mt-1 text-sm text-gray-500">
          Ordena las imágenes como aparecerán en el carrusel del cliente.
        </p>
      </div>
      <button
        type="button"
        :disabled="disabled"
        class="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="openFilePicker"
      >
        Agregar
      </button>
    </div>

    <input
      ref="fileInput"
      type="file"
      class="hidden"
      accept="image/*"
      multiple
      :disabled="disabled"
      @change="handleFilesSelected"
    />

    <button
      v-if="!hasImages"
      type="button"
      :disabled="disabled"
      class="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
      @click="openFilePicker"
    >
      <span class="text-sm font-semibold text-gray-700">No hay imágenes agregadas</span>
      <span class="mt-1 text-sm text-gray-500">Selecciona una o varias imágenes para previsualizarlas.</span>
    </button>

    <div v-else class="space-y-3">
      <article
        v-for="(image, index) in images"
        :key="image.id"
        :draggable="!disabled"
        class="group rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
        :class="draggedIndex === index ? 'opacity-50' : ''"
        @dragstart="handleDragStart(index)"
        @dragover.prevent
        @drop.prevent="handleDrop(index)"
        @dragend="handleDragEnd"
      >
        <div class="flex gap-3">
          <div class="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-gray-200">
            <img
              :src="image.previewUrl"
              :alt="image.alt || `Imagen ${index + 1} del producto`"
              class="h-full w-full object-cover"
            />
            <span
              class="absolute left-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white"
            >
              {{ index + 1 }}
            </span>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-semibold text-gray-800">
                {{ image.isPrimary ? "Portada del carrusel" : `Imagen ${index + 1}` }}
              </span>
              <span
                v-if="image.isPrimary"
                class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
              >
                Principal
              </span>
            </div>
            <p class="mt-1 truncate text-xs text-gray-500">
              {{ image.file?.name || image.existingUrl || "Imagen existente" }}
            </p>
            <p class="mt-2 text-xs text-gray-500">Arrastra esta tarjeta para cambiar su posición.</p>

            <div class="mt-3 flex flex-wrap gap-2">
              <label
                class="inline-flex cursor-pointer items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                :class="disabled ? 'pointer-events-none opacity-50' : ''"
              >
                Cambiar imagen
                <input
                  type="file"
                  class="hidden"
                  accept="image/*"
                  :disabled="disabled"
                  @change="handleReplaceSelected($event, index)"
                />
              </label>
              <button
                type="button"
                :disabled="disabled"
                class="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                @click="removeImage(index)"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>