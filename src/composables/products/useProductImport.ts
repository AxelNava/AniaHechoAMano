import { computed, readonly, shallowRef } from "vue";
import {
  productImportApi,
  type ProductImportApi,
} from "@/services/products/productImportApi";
import type {
  ProductImportConfirmationDto,
  ProductImportPreviewDto,
} from "@/types/products/productImportDto";

export type ProductImportAction = "preview" | "confirm" | "download";

const TEMPLATE_FILE_NAME = "catalogo-importacion-plantilla.xlsx";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return "No se pudo completar la operación de importación.";
};

const resetImportState = (
  preview: { value: ProductImportPreviewDto | null },
  previewFile: { value: File | null },
  confirmation: { value: ProductImportConfirmationDto | null },
) => {
  preview.value = null;
  previewFile.value = null;
  confirmation.value = null;
};

export function useProductImport(api: ProductImportApi = productImportApi) {
  const file = shallowRef<File | null>(null);
  const preview = shallowRef<ProductImportPreviewDto | null>(null);
  const previewFile = shallowRef<File | null>(null);
  const confirmation = shallowRef<ProductImportConfirmationDto | null>(null);
  const error = shallowRef<string | null>(null);
  const busyAction = shallowRef<ProductImportAction | null>(null);

  const loading = computed(() => busyAction.value !== null);
  const canConfirm = computed(
    () =>
      file.value !== null &&
      previewFile.value === file.value &&
      preview.value?.valido === true,
  );

  const selectFile = (selectedFile: File | null): boolean => {
    resetImportState(preview, previewFile, confirmation);
    error.value = null;

    if (!selectedFile) {
      file.value = null;
      return true;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".xlsx")) {
      file.value = null;
      error.value = "Selecciona un archivo con extensión .xlsx.";
      return false;
    }

    file.value = selectedFile;
    return true;
  };

  const previewFileImport = async (): Promise<ProductImportPreviewDto | null> => {
    const selectedFile = file.value;
    if (!selectedFile) {
      error.value = "Selecciona un archivo .xlsx antes de previsualizar.";
      return null;
    }

    if (busyAction.value !== null) return null;

    error.value = null;
    confirmation.value = null;
    preview.value = null;
    previewFile.value = null;
    busyAction.value = "preview";

    try {
      const result = await api.preview(selectedFile);
      preview.value = result;
      previewFile.value = selectedFile;
      return result;
    } catch (cause) {
      error.value = getErrorMessage(cause);
      return null;
    } finally {
      busyAction.value = null;
    }
  };

  const confirm = async (): Promise<ProductImportConfirmationDto | null> => {
    const selectedFile = file.value;
    if (!selectedFile || !canConfirm.value) {
      error.value = "Previsualiza un archivo válido antes de confirmar la importación.";
      return null;
    }

    if (busyAction.value !== null) return null;

    error.value = null;
    confirmation.value = null;
    busyAction.value = "confirm";

    try {
      const result = await api.confirm(selectedFile);
      confirmation.value = result;
      return result;
    } catch (cause) {
      error.value = getErrorMessage(cause);
      return null;
    } finally {
      busyAction.value = null;
    }
  };

  const downloadTemplate = async (): Promise<Blob | null> => {
    if (busyAction.value !== null) return null;

    error.value = null;
    busyAction.value = "download";

    try {
      const blob = await api.downloadTemplate();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = TEMPLATE_FILE_NAME;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      return blob;
    } catch (cause) {
      error.value = getErrorMessage(cause);
      return null;
    } finally {
      busyAction.value = null;
    }
  };

  const clear = () => {
    file.value = null;
    resetImportState(preview, previewFile, confirmation);
    error.value = null;
  };

  return {
    file: readonly(file),
    previewResult: readonly(preview),
    confirmation: readonly(confirmation),
    error: readonly(error),
    loading,
    busyAction: readonly(busyAction),
    canConfirm,
    selectFile,
    preview: previewFileImport,
    confirm,
    downloadTemplate,
    clear,
  };
}
