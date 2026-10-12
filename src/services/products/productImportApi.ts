import { request } from "@/services/http/apiClient";
import type {
  ProductImportConfirmationDto,
  ProductImportPreviewDto,
} from "@/types/products/productImportDto";

const createImportFormData = (file: File): FormData => {
  const formData = new FormData();
  formData.append("archivo", file);
  return formData;
};

export class ProductImportApi {
  public downloadTemplate(): Promise<Blob> {
    return request<Blob>("/productos/importacion/plantilla", {
      method: "GET",
      auth: "required",
      responseType: "blob",
    });
  }

  public preview(file: File): Promise<ProductImportPreviewDto> {
    return request<ProductImportPreviewDto>("/productos/importacion/previsualizar", {
      method: "POST",
      auth: "required",
      body: createImportFormData(file),
    });
  }

  public confirm(file: File): Promise<ProductImportConfirmationDto> {
    return request<ProductImportConfirmationDto>("/productos/importacion/confirmar", {
      method: "POST",
      auth: "required",
      body: createImportFormData(file),
    });
  }
}

export const productImportApi = new ProductImportApi();
