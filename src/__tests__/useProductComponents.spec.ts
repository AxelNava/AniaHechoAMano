import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { ComponenteDto } from "@/types/products/ComponenteDto";
import type { DatosEdicionComponente } from "@/composables/products/useProductComponents";

// Mocks hoisted para poder referenciarlos dentro de las factories de `vi.mock`.
const { createComponentes, updateComponente, getComponentes, toastError, toastSuccess } =
  vi.hoisted(() => ({
    createComponentes: vi.fn(),
    updateComponente: vi.fn(),
    getComponentes: vi.fn(),
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
  }));

vi.mock("@/services/products/componentsApi", () => ({
  ComponentsApi: class {
    createComponentes = createComponentes;
    updateComponente = updateComponente;
    getComponentes = getComponentes;
  },
}));

vi.mock("vue-sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));

import {
  serializarComponentes,
  useProductComponents,
} from "@/composables/products/useProductComponents";
import { useComponentsStore } from "@/stores/componentsStore";

const componenteBase = (over: Partial<ComponenteDto> = {}): ComponenteDto => ({
  id: 1,
  tipo: "MATERIAL",
  nombre: "Papel Crepé",
  descripcion: "Pliego de papel",
  unidad_medida: "pliego",
  requiere_pedido_previo: false,
  activo: true,
  ...over,
});

const datosEdicion = (over: Partial<DatosEdicionComponente> = {}): DatosEdicionComponente => ({
  nombre: "Papel Crepé",
  tipo: "MATERIAL",
  descripcion: "Pliego de papel",
  unidad_medida: "pliego",
  requiere_pedido_previo: false,
  ...over,
});

describe("useProductComponents", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    createComponentes.mockReset();
    updateComponente.mockReset();
    getComponentes.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  describe("gestión de la receta", () => {
    it("agregarFila añade una fila vacía con cantidad 1 y uid estable", () => {
      const receta = useProductComponents();

      receta.agregarFila();
      receta.agregarFila();

      expect(receta.filas.value).toHaveLength(2);
      expect(receta.filas.value[0]).toMatchObject({ componente_id: null, cantidad: 1 });
      expect(receta.filas.value[0].uid).toBeTruthy();
      expect(receta.filas.value[0].uid).not.toBe(receta.filas.value[1].uid);
    });

    it("quitarFila elimina la fila por índice", () => {
      const receta = useProductComponents();
      receta.setReceta([
        { componente_id: 1, cantidad: 2 },
        { componente_id: 2, cantidad: 3 },
      ]);

      receta.quitarFila(0);

      expect(receta.filas.value).toHaveLength(1);
      expect(receta.filas.value[0].componente_id).toBe(2);
    });

    it("setReceta normaliza cantidades a número (acepta strings tipo '2.50')", () => {
      const receta = useProductComponents();

      receta.setReceta([{ componente_id: 1, cantidad: "2.50" as unknown as number }]);

      expect(receta.filas.value[0].cantidad).toBe(2.5);
      expect(receta.recetaValida.value).toEqual([{ componente_id: 1, cantidad: 2.5 }]);
    });

    it("no permite seleccionar un componente ya usado en otra fila", () => {
      const receta = useProductComponents();
      receta.setReceta([{ componente_id: 1, cantidad: 2 }]);
      receta.agregarFila();

      const resultado = receta.seleccionarComponente(1, 1);

      expect(resultado).toBe(false);
      expect(receta.filas.value[1].componente_id).toBeNull();
      expect(toastError).toHaveBeenCalled();
    });

    it("seleccionarComponente asigna el id cuando no está duplicado", () => {
      const receta = useProductComponents();
      receta.setReceta([{ componente_id: 1, cantidad: 2 }]);
      receta.agregarFila();

      const resultado = receta.seleccionarComponente(1, 5);

      expect(resultado).toBe(true);
      expect(receta.filas.value[1].componente_id).toBe(5);
      expect(receta.esDuplicado(1)).toBe(false);
    });

    it("recetaValida excluye filas sin componente o con cantidad 0/negativa/NaN", () => {
      const receta = useProductComponents();
      receta.setReceta([
        { componente_id: 1, cantidad: 2 },
        { componente_id: 2, cantidad: 0 },
        { componente_id: 3, cantidad: -1 },
        { componente_id: 4, cantidad: NaN },
      ]);
      receta.agregarFila(); // fila sin componente

      expect(receta.recetaValida.value).toEqual([{ componente_id: 1, cantidad: 2 }]);
    });
  });

  describe("crearCopiaParaProducto", () => {
    it("crea la copia con el nombre ORIGINAL del store como base y forzarCreacion", async () => {
      const store = useComponentsStore();
      store.components = [componenteBase()];
      createComponentes.mockResolvedValue(
        componenteBase({ id: 99, nombre: "Papel Crepé - copia para Piñata Luna" }),
      );

      const receta = useProductComponents();
      receta.setReceta([{ componente_id: 1, cantidad: 2 }]);

      // El usuario editó el nombre en el formulario, pero la copia debe partir
      // del nombre original del store.
      const exito = await receta.crearCopiaParaProducto(
        0,
        datosEdicion({ nombre: "Papel editado por el usuario" }),
        "Piñata Luna",
      );

      expect(exito).toBe(true);
      expect(createComponentes).toHaveBeenCalledWith({
        tipo: "MATERIAL",
        nombre: "Papel Crepé - copia para Piñata Luna",
        descripcion: "Pliego de papel",
        unidad_medida: "pliego",
        requiere_pedido_previo: false,
        activo: true,
        forzarCreacion: true,
      });
      // Reemplaza el componente de la fila por la copia y conserva la cantidad.
      expect(receta.filas.value[0].componente_id).toBe(99);
      expect(receta.filas.value[0].cantidad).toBe(2);
      // La copia queda disponible en el store.
      expect(store.components.some((c) => c.id === 99)).toBe(true);
    });

    it("si el POST devuelve null no toca la fila ni el store y avisa con toast", async () => {
      const store = useComponentsStore();
      store.components = [componenteBase()];
      createComponentes.mockResolvedValue(null);

      const receta = useProductComponents();
      receta.setReceta([{ componente_id: 1, cantidad: 2 }]);

      const exito = await receta.crearCopiaParaProducto(0, datosEdicion(), "Piñata Luna");

      expect(exito).toBe(false);
      expect(receta.filas.value[0].componente_id).toBe(1);
      expect(store.components).toHaveLength(1);
      expect(toastError).toHaveBeenCalled();
      expect(receta.guardando.value).toBe(false);
    });

    it("trata como fallo una respuesta sin id numérico (ProblemDetails)", async () => {
      const store = useComponentsStore();
      store.components = [componenteBase()];
      // `useFetch` no comprueba `response.ok`: un 4xx llega como "resultado".
      createComponentes.mockResolvedValue({
        status: 409,
        title: "Conflicto",
        detail: "Ya existe un componente similar",
      });

      const receta = useProductComponents();
      receta.setReceta([{ componente_id: 1, cantidad: 2 }]);

      const exito = await receta.crearCopiaParaProducto(0, datosEdicion(), "Piñata Luna");

      expect(exito).toBe(false);
      expect(receta.filas.value[0].componente_id).toBe(1);
      expect(store.components).toHaveLength(1);
      expect(toastError).toHaveBeenCalled();
    });
  });

  describe("editarComponenteGlobal", () => {
    it("hace PATCH con los campos editados y actualiza el store con la respuesta", async () => {
      const store = useComponentsStore();
      store.components = [componenteBase()];
      updateComponente.mockResolvedValue(
        componenteBase({ nombre: "Papel Metálico", unidad_medida: "metro" }),
      );

      const receta = useProductComponents();
      receta.setReceta([{ componente_id: 1, cantidad: 2 }]);

      const exito = await receta.editarComponenteGlobal(
        0,
        datosEdicion({ nombre: "Papel Metálico", unidad_medida: "metro" }),
      );

      expect(exito).toBe(true);
      expect(updateComponente).toHaveBeenCalledWith(1, {
        tipo: "MATERIAL",
        nombre: "Papel Metálico",
        descripcion: "Pliego de papel",
        unidad_medida: "metro",
        requiere_pedido_previo: false,
      });
      // El store refleja la respuesta del PATCH, no los datos locales.
      expect(store.components[0].nombre).toBe("Papel Metálico");
      expect(store.components[0].unidad_medida).toBe("metro");
    });

    it("si el PATCH falla avisa con toast y deja el store intacto", async () => {
      const store = useComponentsStore();
      store.components = [componenteBase()];
      updateComponente.mockResolvedValue(null);

      const receta = useProductComponents();
      receta.setReceta([{ componente_id: 1, cantidad: 2 }]);

      const exito = await receta.editarComponenteGlobal(
        0,
        datosEdicion({ nombre: "Papel Metálico" }),
      );

      expect(exito).toBe(false);
      expect(store.components[0].nombre).toBe("Papel Crepé");
      expect(toastError).toHaveBeenCalled();
      expect(receta.guardando.value).toBe(false);
    });
  });

  describe("serializarComponentes", () => {
    it("serializa la receta como JSON de componente_id y cantidad numéricos", () => {
      const json = serializarComponentes([
        { componente_id: 1, cantidad: "2.50" as unknown as number },
        { componente_id: 2, cantidad: 3 },
      ]);

      expect(JSON.parse(json)).toEqual([
        { componente_id: 1, cantidad: 2.5 },
        { componente_id: 2, cantidad: 3 },
      ]);
    });

    it("devuelve '[]' con una receta vacía", () => {
      expect(serializarComponentes([])).toBe("[]");
    });
  });
});
