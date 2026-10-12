import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";

const {
  createProductWithImages,
  updateProductWithImages,
  getProductById,
  getCategories,
  fetchCategories,
  fetchComponents,
  router,
} = vi.hoisted(() => ({
  createProductWithImages: vi.fn(),
  updateProductWithImages: vi.fn(),
  getProductById: vi.fn(),
  getCategories: vi.fn(),
  fetchCategories: vi.fn(),
  fetchComponents: vi.fn(),
  router: { back: vi.fn() },
}));

const categories = ref([{ id: 1, nombre: "Piñatas" }]);
const components = ref([]);

vi.mock("vue-router", () => ({
  useRouter: () => router,
  useRoute: () => ({ params: { id: "7" } }),
}));

vi.mock("vue-sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("pinia", () => ({
  storeToRefs: (store: Record<string, unknown>) => store,
}));

vi.mock("@/stores/categoriesStore", () => ({
  useCategoriesStore: () => ({ categories, fetchCategories }),
}));

vi.mock("@/stores/componentsStore", () => ({
  useComponentsStore: () => ({ components, fetchComponents }),
}));

vi.mock("@/services/categories/categoriesApi", () => ({
  CategoriesApi: class {
    getCategories = getCategories;
    createCategories = vi.fn();
  },
}));

vi.mock("@/services/products/componentsApi", () => ({
  ComponentsApi: class {
    createComponentes = vi.fn();
  },
}));

vi.mock("@/services/products/productApi", () => ({
  ProductApi: class {
    createProductWithImages = createProductWithImages;
    updateProductWithImages = updateProductWithImages;
    getProductById = getProductById;
  },
  getProductImageBinaryUrl: (id: number) => `/api/productos/imagenes/${id}/binary`,
  resolveProductImageUrl: (url: string) => url,
}));

import ProductCreateView from "@/views/ProductCreateView.vue";
import ProductEditView from "@/views/ProductEditView.vue";

const global = {
  stubs: {
    ProductImagesManager: { template: "<div />" },
    ProductComponentsManager: { template: "<div />" },
  },
};

const productResponse = {
  id: 7,
  nombre: "Piñata Luna",
  descripcion: "Una piñata artesanal.",
  precio_base: 450,
  categoria_id: 1,
  activo: true,
  permite_modificaciones: true,
  requiere_anticipo: true,
  componentes: [],
  imagenes: [],
};

describe("Product admin policy forms", () => {
  beforeEach(() => {
    createProductWithImages.mockReset();
    updateProductWithImages.mockReset();
    getProductById.mockReset();
    getCategories.mockReset();
    fetchCategories.mockReset();
    fetchComponents.mockReset();
    router.back.mockReset();
    getCategories.mockResolvedValue(categories.value);
    fetchCategories.mockResolvedValue(undefined);
    fetchComponents.mockResolvedValue(undefined);
  });

  it("serializa las políticas con false por defecto al crear un producto", async () => {
    createProductWithImages.mockResolvedValue({ ...productResponse });
    const wrapper = mount(ProductCreateView, { global });

    await flushPromises();
    expect(wrapper.get("#permite-modificaciones").attributes("aria-describedby")).toBe(
      "permite-modificaciones-ayuda",
    );
    expect(wrapper.get("#requiere-anticipo").attributes("aria-describedby")).toBe(
      "requiere-anticipo-ayuda",
    );
    expect(wrapper.text()).toContain("Permite solicitudes de modificación");
    expect(wrapper.text()).toContain("Requiere anticipo");
    await wrapper.find("input").setValue("Piñata Luna");
    await wrapper.find('input[type="number"]').setValue("450");
    await wrapper.find("select").setValue("1");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    const formData = createProductWithImages.mock.calls[0]?.[0] as FormData;
    expect(formData.get("permite_modificaciones")).toBe("false");
    expect(formData.get("requiere_anticipo")).toBe("false");
  });

  it("serializa true y luego false al crear al desactivar ambas políticas", async () => {
    createProductWithImages.mockResolvedValue({ ...productResponse });
    const wrapper = mount(ProductCreateView, { global });

    await flushPromises();
    await wrapper.find("#permite-modificaciones").setValue(true);
    await wrapper.find("#requiere-anticipo").setValue(true);
    await wrapper.find("input").setValue("Piñata Luna");
    await wrapper.find('input[type="number"]').setValue("450");
    await wrapper.find("select").setValue("1");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    let formData = createProductWithImages.mock.calls[0]?.[0] as FormData;
    expect(formData.get("permite_modificaciones")).toBe("true");
    expect(formData.get("requiere_anticipo")).toBe("true");

    await wrapper.find("#permite-modificaciones").setValue(true);
    await wrapper.find("#requiere-anticipo").setValue(true);
    await wrapper.find("#permite-modificaciones").setValue(false);
    await wrapper.find("#requiere-anticipo").setValue(false);
    await wrapper.find("input").setValue("Piñata Luna");
    await wrapper.find('input[type="number"]').setValue("450");
    await wrapper.find("select").setValue("1");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    formData = createProductWithImages.mock.calls.at(-1)?.[0] as FormData;
    expect(formData.get("permite_modificaciones")).toBe("false");
    expect(formData.get("requiere_anticipo")).toBe("false");
    expect(formData.get("activo")).toBe("true");
    expect(formData.get("componentes")).toBe("[]");
  });

  it("hidrata las políticas del producto y serializa false al desactivarlas al editar", async () => {
    getProductById.mockResolvedValue({ ...productResponse });
    updateProductWithImages.mockResolvedValue({
      ...productResponse,
      permite_modificaciones: false,
      requiere_anticipo: false,
    });
    const wrapper = mount(ProductEditView, { global });

    await flushPromises();
    expect(getProductById).toHaveBeenCalledWith(7);
    expect((wrapper.get("#permite-modificaciones").element as HTMLInputElement).checked).toBe(true);
    expect((wrapper.get("#requiere-anticipo").element as HTMLInputElement).checked).toBe(true);
    expect(wrapper.get("#permite-modificaciones").attributes("aria-describedby")).toBe(
      "permite-modificaciones-ayuda",
    );
    expect(wrapper.get("#requiere-anticipo").attributes("aria-describedby")).toBe(
      "requiere-anticipo-ayuda",
    );

    await wrapper.find("#permite-modificaciones").setValue(false);
    await wrapper.find("#requiere-anticipo").setValue(false);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    const formData = updateProductWithImages.mock.calls[0]?.[1] as FormData;
    expect(formData.get("permite_modificaciones")).toBe("false");
    expect(formData.get("requiere_anticipo")).toBe("false");
    expect(formData.get("activo")).toBe("true");
    expect(formData.get("componentes")).toBe("[]");
    expect(formData.get("imagenes_existentes")).toBe("[]");
  });
});
