import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { ApiError } from "@/services/http/apiClient";
import type { PedidoSeguimientoDto } from "@/types/orders/seguimientoDto";
import { formatDiaISO } from "@/utils/orderDisplay";

const { route, getSeguimientoMock, OrdersApiMock, ProductLayoutStub, RouterLinkStub } = vi.hoisted(
  () => {
    const getSeguimientoMock = vi.fn();
    const OrdersApiMock = vi.fn(function OrdersApiMock() {
      return { getSeguimiento: getSeguimientoMock };
    });
    const ProductLayoutStub = {
      name: "ProductLayout",
      template: "<div><slot /></div>",
    };
    const RouterLinkStub = {
      name: "RouterLink",
      props: { to: { type: [String, Object], required: true } },
      template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
    };

    return { route: { params: { token: "8a8f7e6d-test" } }, getSeguimientoMock, OrdersApiMock, ProductLayoutStub, RouterLinkStub };
  },
);

vi.mock("vue-router", () => ({ useRoute: () => route }));
vi.mock("@/layouts/ProductLayout.vue", () => ({ default: ProductLayoutStub }));
vi.mock("@/services/orders/ordersApi", () => ({ OrdersApi: OrdersApiMock }));

import PedidoSeguimientoView from "@/views/PedidoSeguimientoView.vue";

const makeSeguimiento = (
  overrides: Partial<PedidoSeguimientoDto> = {},
): PedidoSeguimientoDto => ({
  referencia_publica: "AHM-2026-0001",
  estado: "CONFIRMADO",
  retrasado: false,
  fecha_entrega_solicitada: "2026-08-20",
  fecha_entrega_acordada: "2026-08-22",
  ...overrides,
});

const mountView = () =>
  mount(PedidoSeguimientoView, {
    global: { stubs: { ProductLayout: ProductLayoutStub, RouterLink: RouterLinkStub } },
  });

describe("PedidoSeguimientoView", () => {
  beforeEach(() => {
    route.params.token = "8a8f7e6d-test";
    getSeguimientoMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("carga el token de la ruta y renderiza el seguimiento sin red real", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    getSeguimientoMock.mockResolvedValue(makeSeguimiento());

    const wrapper = mountView();
    expect(wrapper.get('[role="status"]').text()).toContain("Cargando el seguimiento");

    await flushPromises();

    expect(getSeguimientoMock).toHaveBeenCalledWith("8a8f7e6d-test");
    expect(wrapper.text()).toContain("AHM-2026-0001");
    expect(wrapper.text()).toContain("Confirmado");
    expect(wrapper.text()).toContain(formatDiaISO("2026-08-20"));
    expect(wrapper.text()).toContain(formatDiaISO("2026-08-22"));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain("8a8f7e6d-test");
  });

  it.each([
    [400, "El enlace de seguimiento no es válido."],
    [404, "No encontramos un pedido para este enlace de seguimiento."],
    [429, "Has realizado demasiadas consultas. Intenta de nuevo más tarde."],
  ] as const)("muestra un mensaje determinista para HTTP %i", async (status, message) => {
    getSeguimientoMock.mockRejectedValue(new ApiError("Detalle técnico", status, null));

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain(message);
  });

  it("muestra el distintivo de retraso y los respaldos de estado y fechas nulos", async () => {
    getSeguimientoMock.mockResolvedValue(
      makeSeguimiento({
        referencia_publica: null,
        estado: null,
        retrasado: true,
        fecha_entrega_solicitada: null,
        fecha_entrega_acordada: null,
      }),
    );

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain("Sin referencia disponible");
    expect(wrapper.text()).toContain("Sin estado");
    expect(wrapper.text()).toContain("No especificada");
    expect(wrapper.text()).toContain("Por confirmar");

    const delayedBadge = wrapper.findAll("span").find((span) => span.text() === "Retrasado");
    expect(delayedBadge).toBeDefined();
    expect(delayedBadge!.classes()).toEqual(
      expect.arrayContaining(["bg-amber-100", "text-amber-800"]),
    );
  });
});
