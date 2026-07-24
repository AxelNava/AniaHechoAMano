import { afterEach, describe, expect, it, vi } from "vitest";
import { ComponentsApi } from "@/services/products/componentsApi";
import type { ComponenteDto } from "@/types/products/ComponenteDto";

const componente: ComponenteDto = {
  id: 5,
  tipo: "MATERIAL",
  nombre: "Papel Crepé",
  descripcion: "Pliego de papel",
  unidad_medida: "pliego",
  requiere_pedido_previo: false,
  activo: true,
};

const stubFetchJson = (data: unknown) => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => data });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("ComponentsApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("updateComponente", () => {
    it("hace PATCH a productos/componentes/:id con el body parcial", async () => {
      const fetchMock = stubFetchJson(componente);
      const api = new ComponentsApi();

      await api.updateComponente(5, { nombre: "Papel Metálico", unidad_medida: "metro" });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/productos\/componentes\/5$/);
      expect(options.method).toBe("PATCH");
      expect(JSON.parse(options.body as string)).toEqual({
        nombre: "Papel Metálico",
        unidad_medida: "metro",
      });
    });

    it("devuelve el componente cuando la respuesta trae un id numérico", async () => {
      stubFetchJson({ ...componente, nombre: "Papel Metálico" });
      const api = new ComponentsApi();

      const resultado = await api.updateComponente(5, { nombre: "Papel Metálico" });

      expect(resultado).not.toBeNull();
      expect(resultado?.id).toBe(5);
      expect(resultado?.nombre).toBe("Papel Metálico");
    });

    it("devuelve null cuando la respuesta es un ProblemDetails sin id", async () => {
      // `useFetch` no comprueba `response.ok`: el cuerpo RFC 7807 llega como JSON.
      stubFetchJson({ status: 404, title: "No encontrado", detail: "Componente no encontrado" });
      const api = new ComponentsApi();

      const resultado = await api.updateComponente(999, { nombre: "X" });

      expect(resultado).toBeNull();
    });

    it("devuelve null en un error de red", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
      vi.spyOn(console, "error").mockImplementation(() => {});
      const api = new ComponentsApi();

      const resultado = await api.updateComponente(5, { nombre: "X" });

      expect(resultado).toBeNull();
    });
  });

  describe("createComponentes", () => {
    it("incluye forzarCreacion en el body cuando se pasa", async () => {
      const fetchMock = stubFetchJson({ ...componente, id: 99 });
      const api = new ComponentsApi();

      await api.createComponentes({
        tipo: "MATERIAL",
        nombre: "Papel Crepé - copia para Piñata Luna",
        descripcion: "Pliego de papel",
        unidad_medida: "pliego",
        requiere_pedido_previo: false,
        activo: true,
        forzarCreacion: true,
      });

      const [url, options] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/productos\/componentes\/new$/);
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body as string)).toMatchObject({
        nombre: "Papel Crepé - copia para Piñata Luna",
        forzarCreacion: true,
      });
    });
  });
});
