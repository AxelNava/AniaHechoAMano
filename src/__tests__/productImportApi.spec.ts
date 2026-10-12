import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "@/services/http/apiClient";
import { ProductImportApi } from "@/services/products/productImportApi";
import type { ProductImportPreviewDto } from "@/types/products/productImportDto";

vi.mock("@/services/http/apiClient", () => ({
  request: vi.fn(),
}));

const requestMock = vi.mocked(request);

const preview: ProductImportPreviewDto = {
  valido: true,
  sha256: "hash-123",
  resumen: {
    categorias: { crear: 1, actualizar: 2, total: 3 },
    etiquetas: { crear: 2, actualizar: 0, total: 2 },
    componentes: { crear: 4, actualizar: 1, total: 5 },
    productos: { crear: 6, actualizar: 3, total: 9 },
    relaciones: { componentes: 7, etiquetas: 8 },
  },
  errores: [],
};

const file = new File(["clave,nombre"], "catalogo.xlsx", {
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
});

const getFormData = (callIndex = 0): FormData => {
  const [, options] = requestMock.mock.calls[callIndex] as [string, { body?: unknown }];
  expect(options.body).toBeInstanceOf(FormData);
  return options.body as FormData;
};

describe("ProductImportApi", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("descarga la plantilla como blob con autenticación", async () => {
    const blob = new Blob(["xlsx"]);
    requestMock.mockResolvedValue(blob);

    const result = await new ProductImportApi().downloadTemplate();

    expect(result).toBe(blob);
    expect(requestMock).toHaveBeenCalledWith("/productos/importacion/plantilla", {
      method: "GET",
      auth: "required",
      responseType: "blob",
    });
  });

  it("envía el archivo en el campo archivo para previsualizar", async () => {
    requestMock.mockResolvedValue(preview);

    const result = await new ProductImportApi().preview(file);

    expect(result).toBe(preview);
    expect(requestMock).toHaveBeenCalledWith(
      "/productos/importacion/previsualizar",
      expect.objectContaining({ method: "POST", auth: "required" }),
    );
    expect(getFormData().get("archivo")).toBe(file);
  });

  it("envía el mismo contrato multipart para confirmar", async () => {
    const confirmation = { sha256: preview.sha256, resumen: preview.resumen };
    requestMock.mockResolvedValue(confirmation);

    const result = await new ProductImportApi().confirm(file);

    expect(result).toBe(confirmation);
    expect(requestMock).toHaveBeenCalledWith(
      "/productos/importacion/confirmar",
      expect.objectContaining({ method: "POST", auth: "required" }),
    );
    expect(getFormData().get("archivo")).toBe(file);
  });
});
