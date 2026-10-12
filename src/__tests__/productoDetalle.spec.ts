import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const {
  getProductById,
  getProductOrderOptions,
  route,
  router,
} = vi.hoisted(() => ({
  getProductById: vi.fn(),
  getProductOrderOptions: vi.fn(),
  route: { params: { slug: "piñatas", id: "7" } },
  router: { push: vi.fn() },
}));

vi.mock("vue-router", () => ({
  useRoute: () => route,
  useRouter: () => router,
}));

vi.mock("@/services/products/productApi", () => ({
  ProductApi: class {
    getProductById = getProductById;
    getProductOrderOptions = getProductOrderOptions;
  },
  resolveProductBinaryUrl: (url: string) => url,
  resolveProductImageUrl: (url: string) => url,
}));

vi.mock("@/composables/pedido/usePedidoCliente", () => ({
  usePedidoCliente: () => ({ agregarLinea: vi.fn() }),
}));

vi.mock("vue-sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import ProductoDetalleView from "@/views/ProductoDetalleView.vue";

type AltFixture = string | null | number | undefined;

type ProductFixture = Record<string, unknown>;

const opcionesValidas = {
  id: 7,
  nombre: "Piñata Luna",
  precio_base: 450,
  permite_modificaciones: false,
  requiere_anticipo: false,
};

const crearProducto = (alt: AltFixture): ProductFixture => {
  const imagen: Record<string, unknown> = {
    id: 70,
    url: "/uploads/pinata-luna.jpg",
    orden: 0,
  };

  if (alt !== undefined) imagen.alt = alt;

  return {
    id: 7,
    nombre: "Piñata Luna",
    descripcion: "Una piñata artesanal.",
    precio_base: 450,
    categoria_id: 3,
    activo: true,
    permite_modificaciones: false,
    requiere_anticipo: false,
    componentes: [],
    imagenes: [imagen],
  };
};

const montarConImagen = async (alt: AltFixture) => {
  getProductById.mockResolvedValueOnce(crearProducto(alt));
  getProductOrderOptions.mockResolvedValueOnce(opcionesValidas);

  const wrapper = mount(ProductoDetalleView, {
    global: {
      stubs: {
        ProductLayout: { template: "<div><slot /></div>" },
        RouterLink: { template: "<a><slot /></a>" },
      },
    },
  });

  await flushPromises();
  return wrapper;
};

describe("ProductoDetalleView", () => {
  beforeEach(() => {
    route.params.slug = "piñatas";
    route.params.id = "7";
    getProductById.mockReset();
    getProductOrderOptions.mockReset();
    router.push.mockReset();
  });

  it.each([
    {
      caso: "alt nulo",
      alt: null,
      altEsperado: "Piñata Luna, imagen 1",
    },
    {
      caso: "alt textual",
      alt: "Vista frontal de la Piñata Luna",
      altEsperado: "Vista frontal de la Piñata Luna",
    },
    {
      caso: "alt ausente",
      alt: undefined,
      altEsperado: "Piñata Luna, imagen 1",
    },
  ])("acepta un producto válido cuando $caso y conserva el alt de la imagen", async ({ alt, altEsperado }) => {
    const wrapper = await montarConImagen(alt);

    expect(wrapper.find("article").exists()).toBe(true);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.get("#imagen-principal").attributes("alt")).toBe(altEsperado);
  });

  it("rechaza una imagen con alt numérico sin relajar el resto de la validación", async () => {
    const wrapper = await montarConImagen(123);

    expect(wrapper.find("article").exists()).toBe(false);
    expect(wrapper.get('[role="alert"] h1').text()).toBe("Producto no disponible");
  });
});
