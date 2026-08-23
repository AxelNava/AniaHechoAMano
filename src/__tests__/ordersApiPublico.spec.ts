import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ProblemDetails } from "@/services/http/apiClient";
import { OrdersApi } from "@/services/orders/ordersApi";
import type { CreatePedidoPublicoDto } from "@/types/orders/createPedidoPublicoDto";
import type { PedidoSeguimientoDto } from "@/types/orders/seguimientoDto";

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

describe("OrdersApi.getSeguimiento", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const stubJson = (body: unknown, status = 200) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  const captureApiError = async (request: Promise<unknown>): Promise<ApiError> => {
    try {
      await request;
      throw new Error("La solicitud debía fallar.");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      return error as ApiError;
    }
  };

  it("hace GET al seguimiento con el token codificado y devuelve el estado", async () => {
    const token = "token/con espacio";
    const seguimiento: PedidoSeguimientoDto = {
      referencia_publica: "AHM-2026-0001",
      estado: "CONFIRMADO",
      retrasado: false,
      fecha_entrega_solicitada: "2026-08-20",
      fecha_entrega_acordada: "2026-08-21",
    };
    const fetchMock = stubJson(seguimiento);

    await expect(new OrdersApi().getSeguimiento(token)).resolves.toBe(seguimiento);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/pedidos/seguimiento/${encodeURIComponent(token)}`),
      { method: "GET" },
    );
  });

  const problemCases: Array<[number, ProblemDetails["code"]]> = [
    [404, "NOT_FOUND"],
    [400, "VALIDATION_ERROR"],
    [429, "RATE_LIMITED"],
  ];

  it.each(problemCases)(
    "preserva ProblemDetails HTTP %i con código %s",
    async (status, code) => {
      const problem: ProblemDetails = {
        type: `https://ania.test/problems/${code}`,
        title: "Error controlado",
        status,
        detail: `Detalle HTTP ${status}`,
        code,
      };
      stubJson(problem, status);

      const error = await captureApiError(new OrdersApi().getSeguimiento("token-invalido"));

      expect(error.status).toBe(status);
      expect(error.problem).toBe(problem);
      expect(error.problem?.code).toBe(code);
    },
  );
});
