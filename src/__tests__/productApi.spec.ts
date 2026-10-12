import { afterEach, describe, expect, it, vi } from "vitest";

describe("product API URL resolution", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reuses the normalized API base and origin for static and binary URLs", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/");
    vi.stubEnv("VITE_VUE_APP_DOMAIN", "http://legacy.example");
    vi.resetModules();
    const { getProductImageBinaryUrl, resolveProductBinaryUrl, resolveProductImageUrl } =
      await import("@/services/products/productApi");

    expect(resolveProductImageUrl("/uploads/productos/foto.webp")).toBe(
      "https://api.example.test/uploads/productos/foto.webp",
    );
    expect(resolveProductBinaryUrl("/productos/1/imagenes/2/binario")).toBe(
      "https://api.example.test/api/productos/1/imagenes/2/binario",
    );
    expect(getProductImageBinaryUrl(2)).toBe(
      "https://api.example.test/api/productos/imagenes/2/binary",
    );
  });

  it("preserves absolute, blob, and data image URLs", async () => {
    vi.resetModules();
    const { resolveProductBinaryUrl, resolveProductImageUrl } = await import(
      "@/services/products/productApi"
    );
    const urls = [
      "https://cdn.example.test/foto.webp",
      "blob:https://example.test/id",
      "data:image/png;base64,abc",
    ];

    for (const url of urls) {
      expect(resolveProductImageUrl(url)).toBe(url);
      expect(resolveProductBinaryUrl(url)).toBe(url);
    }
  });

  it("consulta las opciones seguras de pedido sin autenticación y conserva el tiempo público", async () => {
    vi.resetModules();
    const opciones = {
      id: 7,
      nombre: "Piñata temática",
      precio_base: 325.5,
      tiempo_total_estimado_minutos: 120,
      permite_modificaciones: true,
      requiere_anticipo: false,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => opciones,
    });
    vi.stubGlobal("fetch", fetchMock);
    const { ProductApi } = await import("@/services/products/productApi");

    await expect(new ProductApi().getProductOrderOptions(7)).resolves.toEqual(opciones);

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3001/api/productos/7/opciones-pedido", {
      method: "GET",
    });
  });
});
