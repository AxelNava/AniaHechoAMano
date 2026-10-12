import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { usePedidoMinutosPedido } from "@/composables/pedido/usePedidoMinutosPedido";
import type { PedidoClienteLinea } from "@/types/orders/pedidoCliente";

const { getProductOrderOptions, getProductOrderInfo } = vi.hoisted(() => ({
  getProductOrderOptions: vi.fn(),
  getProductOrderInfo: vi.fn(),
}));

vi.mock("@/services/products/productApi", () => ({
  ProductApi: class {
    getProductOrderOptions = getProductOrderOptions;
    getProductOrderInfo = getProductOrderInfo;
  },
}));

const linea = (producto_id: number, uid: string) => ({ producto_id, uid }) as PedidoClienteLinea;
const info = (id: number, minutos: number) => ({
  id,
  tiempo_total_estimado_minutos: minutos,
});

describe("usePedidoMinutosPedido", () => {
  beforeEach(() => {
    getProductOrderOptions.mockReset();
    getProductOrderInfo.mockReset();
  });

  it("consulta cada producto una vez y cuenta las líneas duplicadas usando el endpoint público", async () => {
    getProductOrderOptions.mockImplementation(async (id: number) => info(id, id === 1 ? 30 : 45));
    const minutos = usePedidoMinutosPedido(ref([linea(1, "a"), linea(1, "b"), linea(2, "c")]));

    await minutos.hidratar();

    expect(getProductOrderOptions).toHaveBeenCalledTimes(2);
    expect(getProductOrderOptions.mock.calls.map(([id]) => id).sort()).toEqual([1, 2]);
    expect(getProductOrderInfo).not.toHaveBeenCalled();
    expect(minutos.minutosTotales.value).toBe(105);
    expect(minutos.error.value).toBe("");
  });

  it.each([
    ["nula", null],
    ["ausente", { id: 1 }],
    ["con id distinto", info(99, 30)],
    ["no finita", info(1, Number.NaN)],
    ["negativa", info(1, -1)],
  ])("bloquea una respuesta %s", async (_caso, respuesta) => {
    getProductOrderOptions.mockResolvedValue(respuesta);
    const minutos = usePedidoMinutosPedido(ref([linea(1, "a")]));

    await minutos.hidratar();

    expect(minutos.minutosTotales.value).toBeNull();
    expect(minutos.error.value).toContain("tiempo");
    expect(minutos.cargando.value).toBe(false);
  });

  it("permite reintentar después de un fallo", async () => {
    getProductOrderOptions.mockResolvedValueOnce(null).mockResolvedValueOnce(info(1, 25));
    const minutos = usePedidoMinutosPedido(ref([linea(1, "a")]));

    await minutos.hidratar();
    expect(minutos.error.value).not.toBe("");

    await minutos.reintentar();

    expect(minutos.error.value).toBe("");
    expect(minutos.minutosTotales.value).toBe(25);
    expect(getProductOrderOptions).toHaveBeenCalledTimes(2);
    expect(getProductOrderInfo).not.toHaveBeenCalled();
  });
});
