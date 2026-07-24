import { afterEach, describe, expect, it, vi } from "vitest";
import { OrdersApi } from "@/services/orders/ordersApi";
import type { CreatePedidoPublicoDto } from "@/types/orders/createPedidoPublicoDto";

const payload: CreatePedidoPublicoDto = {
  cliente_nuevo: { nombre: "Ana" },
  productos: [{ producto_id: 1, origen: "catalogo", es_modificacion: false }],
};

describe("OrdersApi.createOrderPublico — manejo de ProblemDetails", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve el detalle del pedido cuando la respuesta es OK", async () => {
    const detalle = { id: 5, referencia_publica: "AHM-2026-0001", productos: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => detalle }),
    );

    const api = new OrdersApi();
    const resultado = await api.createOrderPublico(payload);

    expect(resultado.referencia_publica).toBe("AHM-2026-0001");
  });

  it("lanza con el `detail` del ProblemDetails cuando la respuesta NO es OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ status: 409, title: "Conflicto", detail: "La fecha no está disponible" }),
      }),
    );

    const api = new OrdersApi();

    await expect(api.createOrderPublico(payload)).rejects.toThrow("La fecha no está disponible");
  });
});
