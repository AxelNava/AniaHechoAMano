import { computed, onUnmounted, ref } from "vue";
import type { ProductImageDto, ProductImageItem } from "@/types/products/ProductDto";

const createLocalId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `product-image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const createItemFromFile = (file: File): ProductImageItem => ({
  id: createLocalId(),
  file,
  previewUrl: URL.createObjectURL(file),
  orden: 0,
  isPrimary: false,
});

const createItemFromDto = (image: ProductImageDto): ProductImageItem => ({
  id: image.id ? String(image.id) : createLocalId(),
  previewUrl: image.url,
  existingUrl: image.url,
  alt: image.alt,
  orden: image.orden,
  isPrimary: image.orden === 0,
});

export function normalizeProductImages(images: ProductImageItem[]) {
  return images.map((image, index) => ({
    ...image,
    orden: index,
    isPrimary: index === 0,
  }));
}

export function useProductImages(initialImages: ProductImageDto[] = []) {
  const images = ref<ProductImageItem[]>(
    normalizeProductImages(
      [...initialImages].sort((first, second) => first.orden - second.orden).map(createItemFromDto),
    ),
  );

  const orderedImages = computed(() => normalizeProductImages(images.value));

  const revokePreview = (image: ProductImageItem) => {
    if (image.file && image.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }
  };

  const revokeRemovedPreviews = (nextImages: ProductImageItem[]) => {
    const nextPreviewUrls = new Set(nextImages.map((image) => image.previewUrl));

    images.value.forEach((image) => {
      if (!nextPreviewUrls.has(image.previewUrl)) {
        revokePreview(image);
      }
    });
  };

  const setImages = (nextImages: ProductImageItem[]) => {
    revokeRemovedPreviews(nextImages);
    images.value = normalizeProductImages(nextImages);
  };

  const addImages = (files: File[] | FileList) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;

    setImages([...images.value, ...imageFiles.map(createItemFromFile)]);
  };

  const replaceImage = (index: number, file: File) => {
    if (!file.type.startsWith("image/") || !images.value[index]) return;

    const nextImages = [...images.value];
    const currentImage = nextImages[index];
    revokePreview(currentImage);
    nextImages[index] = {
      ...currentImage,
      file,
      previewUrl: URL.createObjectURL(file),
      existingUrl: currentImage.existingUrl,
    };

    setImages(nextImages);
  };

  const removeImage = (index: number) => {
    const nextImages = [...images.value];
    const [removedImage] = nextImages.splice(index, 1);
    if (removedImage) {
      revokePreview(removedImage);
    }

    setImages(nextImages);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || !images.value[fromIndex] || !images.value[toIndex]) return;

    const nextImages = [...images.value];
    const [movedImage] = nextImages.splice(fromIndex, 1);
    nextImages.splice(toIndex, 0, movedImage);

    setImages(nextImages);
  };

  const clearImages = () => {
    images.value.forEach(revokePreview);
    images.value = [];
  };

  onUnmounted(clearImages);

  return {
    images,
    orderedImages,
    setImages,
    addImages,
    replaceImage,
    removeImage,
    moveImage,
    clearImages,
  };
}