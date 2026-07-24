import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { PedidoDetalleDto } from "@/types/orders/orderHistoryDto";

// Mocks hoisted para poder referenciarlos dentro de las factories de `vi.mock`.
const { confirmarPedido, cotizarPedido, toastError, toastSuccess } = vi.hoisted(() => ({
  confirmarPedido: vi.fn(),
  cotizarPedido: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/services/orders/ordersApi", () => ({
  OrdersApi: class {
    confirmarPedido = confirmarPedido;
    cotizarPedido = cotizarPedido;
  },
}));

// La disponibilidad hace fetch al montarse (calendario): la neutralizamos.
vi.mock("@/services/disponibilidad/disponibilidadApi", () => ({
  disponibilidadApi: {
    getDias: vi.fn().mockResolvedValue(null),
    evaluar: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("vue-sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));

import { usePedidoAdminAcciones } from "@/composables/orders/usePedidoAdminAcciones";

const basePedido = (over: Partial<PedidoDetalleDto> = {}): PedidoDetalleDto => ({
  id: 7,
  cliente_id: 1,
  nombre: null,
  referencia_publica: "AHM-2026-0007",
  fecha_solicitud: "2026-07-01T00:00:00.000Z",
  fecha_entrega_solicitada: "2026-07-20T00:00:00.000Z",
  fecha_entrega_acordada: null,
  estado: "PENDIENTE_CONFIRMACION",
  precio_final_total: 100,
  anticipo_pagado: 0,
  notas_admin: null,
  maps_url_omitida: false,
  entrega: null,
  producto_id: null,
  categoria: null,
  imagen_referencia_url: null,
  imagen_producto_id: null,
  productos: [
    {
      id: 11,
      descripcion_cliente: "Piñata personalizada",
      es_modificacion: true,
      precio_estimado_ia: null,
      precio_fijado_admin: null,
      tiempo_total_estimado_minutos: 30,
      foto_referencia_url: null,
      imagenes: [],
      componentes: [],
    },
  ],
  ...over,
});

describe("usePedidoAdminAcciones", () => {
  beforeEach(() => {
    confirmarPedido.mockReset();
    cotizarPedido.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  it("expone las acciones habilitadas según el estado del pedido", () => {
    const pendiente = ref<PedidoDetalleDto | null>(basePedido({ estado: "PENDIENTE_CONFIRMACION" }));
    const acc = usePedidoAdminAcciones(() => pendiente.value, () => {});
    expect(acc.puedeConfirmar.value).toBe(true);
    expect(acc.puedeCotizar.value).toBe(false);

    pendiente.value = basePedido({ estado: "COTIZANDO" });
    expect(acc.puedeConfirmar.value).toBe(false);
    expect(acc.puedeCotizar.value).toBe(true);
  });

  it("abrirConfirmar preselecciona la fecha solicitada del cliente como día ISO", () => {
    const pedido = ref<PedidoDetalleDto | null>(basePedido());
    const acc = usePedidoAdminAcciones(() => pedido.value, () => {});

    acc.abrirConfirmar();

    expect(acc.dialogo.value).toBe("confirmar");
    expect(acc.fechaElegida.value).toBe("2026-07-20");
  });

  it("abrirCotizar normaliza el precio nulo a cadena vacía y copia el tiempo congelado", () => {
    const pedido = ref<PedidoDetalleDto | null>(basePedido({ estado: "COTIZANDO" }));
    const acc = usePedidoAdminAcciones(() => pedido.value, () => {});

    acc.abrirCotizar();

    expect(acc.dialogo.value).toBe("cotizar");
    expect(acc.lineasCotizar.value).toEqual([
      { producto_pedido_id: 11, descripcion: "Piñata personalizada", precio: "", tiempo: 30 },
    ]);
  });

  it("confirmar envía la fecha elegida y propaga el detalle actualizado", async () => {
    const detalleActualizado = basePedido({ estado: "CONFIRMADO", fecha_entrega_acordada: "2026-07-20T00:00:00.000Z" });
    confirmarPedido.mockResolvedValue(detalleActualizado);
    const onExito = vi.fn();
    const pedido = ref<PedidoDetalleDto | null>(basePedido());
    const acc = usePedidoAdminAcciones(() => pedido.value, onExito);

    acc.abrirConfirmar();
    await acc.confirmar();

    expect(confirmarPedido).toHaveBeenCalledWith(7, { fecha_entrega_acordada: "2026-07-20" });
    expect(onExito).toHaveBeenCalledWith(detalleActualizado);
    expect(acc.dialogo.value).toBeNull();
  });

  it("cotizar exige una fecha antes de llamar al API", async () => {
    const pedido = ref<PedidoDetalleDto | null>(basePedido({ estado: "COTIZANDO" }));
    const acc = usePedidoAdminAcciones(() => pedido.value, () => {});

    acc.abrirCotizar();
    await acc.cotizar();

    expect(cotizarPedido).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
  });

  it("cotizar rechaza un precio vacío por línea", async () => {
    const pedido = ref<PedidoDetalleDto | null>(basePedido({ estado: "COTIZANDO" }));
    const acc = usePedidoAdminAcciones(() => pedido.value, () => {});

    acc.abrirCotizar();
    acc.fechaElegida.value = "2026-07-25";
    // precio queda como "" (nulo normalizado) → inválido
    await acc.cotizar();

    expect(cotizarPedido).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
  });

  it("cotizar envía precio y tiempo por línea (omite el tiempo si queda vacío)", async () => {
    const detalleActualizado = basePedido({ estado: "ESPERANDO_ANTICIPO" });
    cotizarPedido.mockResolvedValue(detalleActualizado);
    const onExito = vi.fn();
    const pedido = ref<PedidoDetalleDto | null>(
      basePedido({
        estado: "COTIZANDO",
        productos: [
          {
            id: 11,
            descripcion_cliente: "Con tiempo",
            es_modificacion: true,
            precio_estimado_ia: null,
            precio_fijado_admin: null,
            tiempo_total_estimado_minutos: null,
            foto_referencia_url: null,
            imagenes: [],
            componentes: [],
          },
          {
            id: 12,
            descripcion_cliente: "Sin tiempo",
            es_modificacion: true,
            precio_estimado_ia: null,
            precio_fijado_admin: null,
            tiempo_total_estimado_minutos: null,
            foto_referencia_url: null,
            imagenes: [],
            componentes: [],
          },
        ],
      }),
    );
    const acc = usePedidoAdminAcciones(() => pedido.value, onExito);

    acc.abrirCotizar();
    acc.fechaElegida.value = "2026-07-25";
    acc.lineasCotizar.value[0].precio = 250;
    acc.lineasCotizar.value[0].tiempo = 45;
    acc.lineasCotizar.value[1].precio = 300;
    acc.lineasCotizar.value[1].tiempo = ""; // sin tiempo → se omite
    await acc.cotizar();

    expect(cotizarPedido).toHaveBeenCalledWith(7, {
      fecha_entrega_acordada: "2026-07-25",
      lineas: [
        { producto_pedido_id: 11, precio_fijado_admin: 250, tiempo_total_estimado_minutos: 45 },
        { producto_pedido_id: 12, precio_fijado_admin: 300 },
      ],
    });
    expect(onExito).toHaveBeenCalledWith(detalleActualizado);
  });
});
