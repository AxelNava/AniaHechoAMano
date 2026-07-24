import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import ProductComponentsManager from "@/components/dashboard/products/ProductComponentsManager.vue";
import { useComponentsStore } from "@/stores/componentsStore";
import type { ComponenteDto } from "@/types/products/ComponenteDto";
import type { ComponentsDto } from "@/types/products/ComponentsDto";

// El composable y el store instancian ComponentsApi; ninguna prueba de este
// spec debe llegar a la red.
const { getComponentes, toastError, toastSuccess } = vi.hoisted(() => ({
  getComponentes: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/services/products/componentsApi", () => ({
  ComponentsApi: class {
    getComponentes = getComponentes;
    createComponentes = vi.fn();
    updateComponente = vi.fn();
  },
}));

vi.mock("vue-sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));

const componentesDelStore: ComponenteDto[] = [
  {
    id: 1,
    tipo: "MATERIAL",
    nombre: "Papel Crepé",
    unidad_medida: "pliego",
    requiere_pedido_previo: false,
    activo: true,
  },
  {
    id: 2,
    tipo: "SERVICIO",
    nombre: "Sublimado",
    unidad_medida: "pieza",
    requiere_pedido_previo: false,
    activo: true,
  },
];

const montar = (modelValue: ComponentsDto[] = []) =>
  mount(ProductComponentsManager, {
    props: {
      nombreProducto: "Piñata Luna",
      modelValue,
    },
  });

describe("ProductComponentsManager", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useComponentsStore();
    store.components = [...componentesDelStore];
    store.isFetched = true; // fetchComponents (onMounted) retorna sin llamar al API
    getComponentes.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  it("pinta una fila por entrada del v-model con el componente resuelto del store", () => {
    const wrapper = montar([
      { componente_id: 1, cantidad: 2 },
      { componente_id: 2, cantidad: 1 },
    ]);

    const selects = wrapper.findAll("select");
    expect(selects).toHaveLength(2);
    expect((selects[0].element as HTMLSelectElement).value).toBe("1");
    expect((selects[1].element as HTMLSelectElement).value).toBe("2");
    expect(selects[0].text()).toContain("Papel Crepé (pliego)");

    const cantidades = wrapper.findAll("input[aria-label='Cantidad']");
    expect((cantidades[0].element as HTMLInputElement).value).toBe("2");
  });

  it("muestra el estado vacío cuando la receta no tiene componentes", () => {
    const wrapper = montar([]);

    expect(wrapper.text()).toContain("No hay componentes en la receta.");
  });

  it("emite update:modelValue solo con filas válidas", async () => {
    const wrapper = montar([{ componente_id: 1, cantidad: 2 }]);

    // Añadir una fila vacía NO debe emitir (la fila aún no es válida).
    await wrapper.find("button[aria-label='Añadir componente']").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    // Al elegir componente en la fila nueva (cantidad 1 por defecto) sí emite.
    const selects = wrapper.findAll("select");
    await selects[1].setValue("2");

    const emitido = wrapper.emitted("update:modelValue");
    expect(emitido).toBeTruthy();
    expect(emitido?.at(-1)?.[0]).toEqual([
      { componente_id: 1, cantidad: 2 },
      { componente_id: 2, cantidad: 1 },
    ]);
  });

  it("una fila cuyo componente no existe en el store se muestra como no disponible pero se conserva en el modelo", async () => {
    const wrapper = montar([
      { componente_id: 99, cantidad: 3 },
      { componente_id: 1, cantidad: 2 },
    ]);

    expect(wrapper.text()).toContain("Componente #99 (no disponible)");

    // No editable: el botón Editar de esa fila queda deshabilitado.
    const botonesEditar = wrapper.findAll("button").filter((b) => b.text() === "Editar");
    expect(botonesEditar[0].attributes("disabled")).toBeDefined();
    expect(botonesEditar[1].attributes("disabled")).toBeUndefined();

    // Sigue siendo quitable, y al quitar la fila válida restante se emite sin ella.
    const botonesQuitar = wrapper.findAll("button").filter((b) => b.text() === "Quitar");
    await botonesQuitar[1].trigger("click");

    const emitido = wrapper.emitted("update:modelValue");
    expect(emitido?.at(-1)?.[0]).toEqual([{ componente_id: 99, cantidad: 3 }]);
  });

  it("no permite duplicar un componente: la opción usada en otra fila está deshabilitada", () => {
    const wrapper = montar([
      { componente_id: 1, cantidad: 2 },
      { componente_id: 2, cantidad: 1 },
    ]);

    const opcionesSegundaFila = wrapper.findAll("select")[1].findAll("option");
    const opcionPapel = opcionesSegundaFila.find((o) => o.text().includes("Papel Crepé"));
    expect(opcionPapel?.attributes("disabled")).toBeDefined();
  });

  it("muestra el estado de carga mientras el store trae los componentes", () => {
    const store = useComponentsStore();
    store.isLoading = true;

    const wrapper = montar([{ componente_id: 1, cantidad: 2 }]);

    expect(wrapper.text()).toContain("Cargando componentes...");
    expect(wrapper.findAll("select")).toHaveLength(0);
  });
});
