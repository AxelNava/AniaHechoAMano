import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import OrderEstadoCell from "@/components/dashboard/order-table-cells/OrderEstadoCell.vue";
import type { PedidoHistorialListItemDto } from "@/types/orders/orderHistoryDto";

const createRow = (retrasado: boolean): PedidoHistorialListItemDto => ({
  id: 1,
  cliente_id: 1,
  nombre: "Pedido de prueba",
  referencia_publica: null,
  fecha_solicitud: "2026-07-01T00:00:00.000Z",
  fecha_entrega_solicitada: null,
  fecha_entrega_acordada: "2026-07-20T00:00:00.000Z",
  estado: "CONFIRMADO",
  retrasado,
  precio_final_total: 100,
  anticipo_pagado: 0,
  notas_admin: null,
  maps_url_omitida: false,
  entrega: null,
  producto_id: null,
  categoria: null,
  imagen_referencia_url: null,
  imagen_producto_id: null,
  productos: [],
});

describe("OrderEstadoCell", () => {
  it("muestra el distintivo Retrasado cuando el pedido está retrasado", () => {
    const wrapper = mount(OrderEstadoCell, {
      props: { row: createRow(true), value: null },
    });

    expect(wrapper.text()).toContain("Confirmado");
    const delayedBadges = wrapper
      .findAll("span")
      .filter((badge) => badge.text() === "Retrasado");
    expect(delayedBadges).toHaveLength(1);
    expect(delayedBadges[0].classes()).toEqual(
      expect.arrayContaining(["bg-amber-100", "text-amber-800"]),
    );
  });

  it("no muestra el distintivo Retrasado cuando el pedido no está retrasado", () => {
    const wrapper = mount(OrderEstadoCell, {
      props: { row: createRow(false), value: null },
    });

    expect(wrapper.text()).toContain("Confirmado");
    expect(wrapper.text()).not.toContain("Retrasado");
    expect(wrapper.findAll("span")).toHaveLength(1);
  });
});
