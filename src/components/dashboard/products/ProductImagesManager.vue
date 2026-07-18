<script setup lang="ts">
import { computed, nextTick, onUnmounted, shallowRef, useTemplateRef, watch } from "vue";
import { resolveProductImageUrl } from "@/services/products/productApi";
import { useProductImages } from "@/composables/products/useProductImages";
import type { ProductImageItem } from "@/types/products/ProductDto";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    titulo?: string;
    subtitulo?: string;
  }>(),
  {
    disabled: false,
    titulo: "Imágenes del producto",
    subtitulo: "Ordena las imágenes como aparecerán en el carrusel del cliente.",
  },
);

const model = defineModel<ProductImageItem[]>({ default: [] });

const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const previewScroller = useTemplateRef<HTMLDivElement>("previewScroller");
const draggedIndex = shallowRef<number | null>(null);
const syncSignature = shallowRef("");
const selectedImage = shallowRef<ProductImageItem | null>(null);
const previewZoom = shallowRef(1);
const isPreviewPanning = shallowRef(false);
const previewPanStartX = shallowRef(0);
const previewPanStartY = shallowRef(0);
const previewScrollStartLeft = shallowRef(0);
const previewScrollStartTop = shallowRef(0);
const isPreviewPointerLocked = shallowRef(false);

const minPreviewZoom = 0.5;
const maxPreviewZoom = 3;
const previewZoomStep = 0.25;

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
const selectedImageAlt = computed(() => selectedImage.value?.alt || "Vista ampliada del producto");
const previewZoomLabel = computed(() => `${Math.round(previewZoom.value * 100)}%`);
const previewContentStyle = computed(() => ({
  height: `${previewZoom.value * 100}%`,
  width: `${previewZoom.value * 100}%`,
}));
const previewScrollerClasses = computed(() =>
  isPreviewPanning.value ? "cursor-none select-none" : "cursor-grab select-none",
);

const normalizeZoom = (value: number) =>
  Math.min(maxPreviewZoom, Math.max(minPreviewZoom, Number(value.toFixed(2))));

const updatePreviewZoom = async (nextZoom: number, anchorClientX?: number, anchorClientY?: number) => {
  const scroller = previewScroller.value;
  const normalizedZoom = normalizeZoom(nextZoom);

  if (!scroller || normalizedZoom === previewZoom.value) return;

  const rect = scroller.getBoundingClientRect();
  const anchorX = anchorClientX === undefined ? rect.width / 2 : anchorClientX - rect.left;
  const anchorY = anchorClientY === undefined ? rect.height / 2 : anchorClientY - rect.top;
  const scrollWidth = Math.max(scroller.scrollWidth, 1);
  const scrollHeight = Math.max(scroller.scrollHeight, 1);
  const scrollRatioX = (scroller.scrollLeft + anchorX) / scrollWidth;
  const scrollRatioY = (scroller.scrollTop + anchorY) / scrollHeight;

  previewZoom.value = normalizedZoom;
  await nextTick();

  scroller.scrollLeft = scrollRatioX * scroller.scrollWidth - anchorX;
  scroller.scrollTop = scrollRatioY * scroller.scrollHeight - anchorY;
};

const zoomInPreview = () => {
  updatePreviewZoom(previewZoom.value + previewZoomStep);
};

const zoomOutPreview = () => {
  updatePreviewZoom(previewZoom.value - previewZoomStep);
};

const resetPreviewZoom = () => {
  previewZoom.value = 1;
  nextTick(() => {
    if (!previewScroller.value) return;

    previewScroller.value.scrollLeft = 0;
    previewScroller.value.scrollTop = 0;
  });
};

const removePreviewPanListeners = () => {
  document.removeEventListener("pointermove", handlePreviewPanMove);
  document.removeEventListener("pointerup", stopPreviewPan);
  document.removeEventListener("pointercancel", stopPreviewPan);
  document.removeEventListener("visibilitychange", stopPreviewPan);
  window.removeEventListener("blur", stopPreviewPan);
};

const stopPreviewPan = () => {
  removePreviewPanListeners();
  isPreviewPanning.value = false;

  if (document.pointerLockElement === previewScroller.value) {
    document.exitPointerLock();
  }
};

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

const moveImageUp = (index: number) => {
  if (props.disabled || index <= 0) return;
  moveImage(index, index - 1);
};

const moveImageDown = (index: number) => {
  if (props.disabled || index >= images.value.length - 1) return;
  moveImage(index, index + 1);
};

const openImagePreview = (image: ProductImageItem) => {
  resetPreviewZoom();
  stopPreviewPan();
  selectedImage.value = image;
};

const closeImagePreview = () => {
  resetPreviewZoom();
  stopPreviewPan();
  selectedImage.value = null;
};

const handlePreviewWheel = (event: WheelEvent) => {
  if (!event.ctrlKey) return;

  event.preventDefault();
  if (event.deltaY < 0) {
    updatePreviewZoom(previewZoom.value + previewZoomStep, event.clientX, event.clientY);
    return;
  }

  updatePreviewZoom(previewZoom.value - previewZoomStep, event.clientX, event.clientY);
};

const handlePreviewPanStart = (event: PointerEvent) => {
  if (event.button !== 0 || !event.isPrimary || !previewScroller.value) return;

  event.preventDefault();
  isPreviewPanning.value = true;
  isPreviewPointerLocked.value = false;
  previewPanStartX.value = event.clientX;
  previewPanStartY.value = event.clientY;
  previewScrollStartLeft.value = previewScroller.value.scrollLeft;
  previewScrollStartTop.value = previewScroller.value.scrollTop;

  document.addEventListener("pointermove", handlePreviewPanMove);
  document.addEventListener("pointerup", stopPreviewPan);
  document.addEventListener("pointercancel", stopPreviewPan);
  document.addEventListener("visibilitychange", stopPreviewPan);
  window.addEventListener("blur", stopPreviewPan);

  previewScroller.value.requestPointerLock?.();
};

const handlePreviewPanMove = (event: PointerEvent) => {
  if (!isPreviewPanning.value || !previewScroller.value) return;

  event.preventDefault();
  if (isPreviewPointerLocked.value) {
    previewScroller.value.scrollLeft -= event.movementX;
    previewScroller.value.scrollTop -= event.movementY;
    return;
  }

  previewScroller.value.scrollLeft = previewScrollStartLeft.value - (event.clientX - previewPanStartX.value);
  previewScroller.value.scrollTop = previewScrollStartTop.value - (event.clientY - previewPanStartY.value);
};

const handlePreviewPointerLockChange = () => {
  isPreviewPointerLocked.value = document.pointerLockElement === previewScroller.value;
};

const preventPreviewContextMenu = (event: MouseEvent) => {
  event.preventDefault();
};

const handleImageError = (event: Event, image: ProductImageItem) => {
  const fallbackUrl = image.existingUrl ? resolveProductImageUrl(image.existingUrl) : "";
  const element = event.target as HTMLImageElement;

  if (fallbackUrl && element.src !== fallbackUrl) {
    element.src = fallbackUrl;
  }
};

document.addEventListener("pointerlockchange", handlePreviewPointerLockChange);

onUnmounted(() => {
  stopPreviewPan();
  document.removeEventListener("pointerlockchange", handlePreviewPointerLockChange);
});
</script>

<template>
  <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div class="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold text-gray-800">{{ titulo }}</h2>
        <p class="mt-1 text-sm text-gray-500">
          {{ subtitulo }}
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
          <button
            type="button"
            class="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-gray-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            @click="openImagePreview(image)"
          >
            <img
              :src="image.previewUrl"
              :alt="image.alt || `Imagen ${index + 1} del producto`"
              class="h-full w-full object-cover"
              @error="handleImageError($event, image)"
            />
            <span
              class="absolute left-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white"
            >
              {{ index + 1 }}
            </span>
            <span
              class="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-center text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              Ver imagen
            </span>
          </button>

          <div class="flex shrink-0 flex-col justify-center gap-1.5">
            <button
              type="button"
              :disabled="disabled || index === 0"
              class="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Mover imagen hacia arriba"
              @click="moveImageUp(index)"
            >
              ↑
            </button>
            <button
              type="button"
              :disabled="disabled || index === images.length - 1"
              class="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Mover imagen hacia abajo"
              @click="moveImageDown(index)"
            >
              ↓
            </button>
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
            <p class="mt-2 text-xs text-gray-500">
              Usa las flechas para reordenar, o arrastra esta tarjeta en pantallas grandes.
            </p>

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

    <Teleport to="body">
      <div
        v-if="selectedImage"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4"
        role="dialog"
        aria-modal="true"
        :aria-label="selectedImageAlt"
        @click.self="closeImagePreview"
      >
        <div
          class="relative flex h-[92vh] max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          @wheel="handlePreviewWheel"
          @contextmenu="preventPreviewContextMenu"
        >
          <div class="flex shrink-0 items-center justify-end border-b border-gray-200 bg-white px-4 py-3">
            <button
              type="button"
              class="rounded-full bg-black/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black"
              @click="closeImagePreview"
            >
              Cerrar
            </button>
          </div>
          <div
            ref="previewScroller"
            class="min-h-0 flex-1 overflow-auto bg-gray-950 p-6 touch-none"
            :class="previewScrollerClasses"
            @pointerdown="handlePreviewPanStart"
          >
            <div class="grid min-h-full min-w-full">
              <div
                class="m-auto shrink-0 transition-[height,width] duration-150 ease-out"
                :style="previewContentStyle"
              >
                <img
                  :src="selectedImage.previewUrl"
                  :alt="selectedImageAlt"
                  class="h-full w-full object-contain"
                  draggable="false"
                  @dragstart.prevent
                  @error="handleImageError($event, selectedImage)"
                />
              </div>
            </div>
          </div>
          <div
            class="m-3 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-inner"
          >
            <button
              type="button"
              class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="previewZoom <= minPreviewZoom"
              @click="zoomOutPreview"
            >
              Alejar
            </button>
            <span class="min-w-14 text-center text-sm font-semibold text-gray-700">
              {{ previewZoomLabel }}
            </span>
            <button
              type="button"
              class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="previewZoom >= maxPreviewZoom"
              @click="zoomInPreview"
            >
              Acercar
            </button>
            <button
              type="button"
              class="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              @click="resetPreviewZoom"
            >
              Restablecer
            </button>
            <span class="basis-full text-center text-xs text-gray-500">
              Usa los botones para acercar o alejar, y arrastra con el dedo o el ratón para
              desplazarte por la imagen.
            </span>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>