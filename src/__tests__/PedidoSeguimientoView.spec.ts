import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { ApiError } from "@/services/http/apiClient";
import type { PedidoSeguimientoDto } from "@/types/orders/seguimientoDto";
import { formatDiaISO } from "@/utils/orderDisplay";

const {
  route,
  getSeguimientoMock,
  getContactoMock,
  OrdersApiMock,
  ProductLayoutStub,
  RouterLinkStub,
} = vi.hoisted(() => {
  const getSeguimientoMock = vi.fn();
  const getContactoMock = vi.fn();
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

  return {
    route: { params: { token: "8a8f7e6d-test" } },
    getSeguimientoMock,
    getContactoMock,
    OrdersApiMock,
    ProductLayoutStub,
    RouterLinkStub,
  };
});

vi.mock("vue-router", () => ({ useRoute: () => route }));
vi.mock("@/layouts/ProductLayout.vue", () => ({ default: ProductLayoutStub }));
vi.mock("@/services/config/configApi", () => ({ configApi: { getContacto: getContactoMock } }));
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
    getContactoMock.mockReset();
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
    expect(wrapper.text()).toContain(
      "Tu pedido tiene un retraso, lamentamos la demora. Nos pondremos en contacto contigo…",
    );
  });

  it.each(["ENTREGADO", "CANCELADO"] as const)(
    "no muestra el aviso de retraso cuando el estado es %s",
    async (estado) => {
      getSeguimientoMock.mockResolvedValue(makeSeguimiento({ estado, retrasado: true }));

      const wrapper = mountView();
      await flushPromises();

      expect(wrapper.text()).not.toContain(
        "Tu pedido tiene un retraso, lamentamos la demora. Nos pondremos en contacto contigo…",
      );
    },
  );

  it("muestra el mensaje de cancelación y enlaza al Messenger con la referencia", async () => {
    getSeguimientoMock.mockResolvedValue(makeSeguimiento({ estado: "CANCELADO", retrasado: true }));
    getContactoMock.mockResolvedValue({
      facebook_page_url: "https://facebook.com/aniahechoamano",
      messenger_url_template: "https://m.me/aniahechoamano?ref={ref}",
    });

    const wrapper = mountView();
    await flushPromises();

    expect(getContactoMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain(
      "Lo sentimos, tu pedido fue cancelado. Lamentamos la situación.",
    );
    expect(wrapper.text()).not.toContain(
      "Tu pedido tiene un retraso, lamentamos la demora. Nos pondremos en contacto contigo…",
    );

    const contactLink = wrapper
      .findAll("a")
      .find((link) => link.text() === "Contactar por Facebook");
    expect(contactLink).toBeDefined();
    expect(contactLink!.attributes("href")).toBe(
      "https://m.me/aniahechoamano?ref=AHM-2026-0001",
    );
    expect(contactLink!.attributes("target")).toBe("_blank");
    expect(contactLink!.attributes("rel")).toBe("noopener");
  });

  it("usa la URL de la página cuando no hay plantilla de Messenger", async () => {
    getSeguimientoMock.mockResolvedValue(makeSeguimiento({ estado: "CANCELADO" }));
    getContactoMock.mockResolvedValue({
      facebook_page_url: "https://facebook.com/aniahechoamano",
      messenger_url_template: "",
    });

    const wrapper = mountView();
    await flushPromises();

    const contactLink = wrapper
      .findAll("a")
      .find((link) => link.text() === "Contactar por Facebook");
    expect(contactLink).toBeDefined();
    expect(contactLink!.attributes("href")).toBe("https://facebook.com/aniahechoamano");
  });

  it("mantiene el seguimiento si falla la configuración de contacto", async () => {
    getSeguimientoMock.mockResolvedValue(makeSeguimiento({ estado: "CANCELADO" }));
    getContactoMock.mockRejectedValue(new Error("config unavailable"));

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain("AHM-2026-0001");
    expect(wrapper.text()).toContain(
      "Lo sentimos, tu pedido fue cancelado. Lamentamos la situación.",
    );
    expect(
      wrapper.findAll("a").some((link) => link.text() === "Contactar por Facebook"),
    ).toBe(false);
  });
});
