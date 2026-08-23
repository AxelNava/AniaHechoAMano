import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ProblemDetails, type ProblemDetailsCode } from "@/services/http/apiClient";
import { EmergenciasApi } from "@/services/disponibilidad/emergenciasApi";

const createDto = { desde: "2026-08-20", hasta: "2026-08-22", motivo: "Cierre" };
const contactadoDto = { contactado: true };
const resolverCanceladoDto = { resolucion: "CANCELADO" } as const;
const resolverRetrasadoDto = { resolucion: "RETRASADO", nueva_fecha: "2026-08-25" } as const;

const stubJson = (body: unknown, status = 200) => {
  const json = vi.fn().mockResolvedValue(body);
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json,
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, json };
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

describe("EmergenciasApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("crea una emergencia por POST y devuelve el detalle", async () => {
    const detalle = { id: 11, dias_bloqueados: ["2026-08-20"] };
    const { fetchMock } = stubJson(detalle, 201);

    await expect(new EmergenciasApi().createEmergencia(createDto)).resolves.toBe(detalle);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/agenda\/emergencias$/), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createDto),
    });
  });

  it("lista emergencias por GET", async () => {
    const lista = [{ id: 11 }, { id: 12 }];
    const { fetchMock } = stubJson(lista);

    await expect(new EmergenciasApi().getEmergencias()).resolves.toBe(lista);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/agenda\/emergencias$/), {
      method: "GET",
    });
  });

  it("obtiene el detalle de una emergencia por GET", async () => {
    const detalle = { id: 23, afectados: [] };
    const { fetchMock } = stubJson(detalle);

    await expect(new EmergenciasApi().getEmergencia(23)).resolves.toBe(detalle);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/agenda\/emergencias\/23$/),
      { method: "GET" },
    );
  });

  it("marca un afectado como contactado por PATCH y devuelve el pedido", async () => {
    const pedido = { id: 41, contactado: true };
    const { fetchMock } = stubJson(pedido);

    await expect(new EmergenciasApi().marcarContactado(23, 41, contactadoDto)).resolves.toBe(
      pedido,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/agenda\/emergencias\/23\/afectados\/41\/contactado$/),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactadoDto),
      },
    );
  });

  it.each([
    ["CANCELADO", resolverCanceladoDto],
    ["RETRASADO", resolverRetrasadoDto],
  ] as const)("resuelve un afectado por POST con payload %s", async (_, dto) => {
    const pedido = { id: 41, resolucion: dto.resolucion };
    const { fetchMock } = stubJson(pedido);

    await expect(new EmergenciasApi().resolverAfectado(23, 41, dto)).resolves.toBe(pedido);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/agenda\/emergencias\/23\/afectados\/41\/resolver$/),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
    );
  });

  it("retira una emergencia por POST sin cuerpo", async () => {
    const detalle = { id: 23, activo: false };
    const { fetchMock } = stubJson(detalle);

    await expect(new EmergenciasApi().retirarEmergencia(23)).resolves.toBe(detalle);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/agenda\/emergencias\/23\/retirar$/),
      { method: "POST" },
    );
  });

  const validProblems: Array<[number, ProblemDetailsCode]> = [
    [400, "VALIDATION_ERROR"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [500, "DATABASE_ERROR"],
  ];

  it.each(validProblems)(
    "preserva un ProblemDetails válido HTTP %i con código %s",
    async (status, code) => {
      const problem: ProblemDetails = {
        type: `https://ania.test/problems/${code}`,
        title: "Error controlado",
        status,
        detail: `Detalle HTTP ${status}`,
        code,
      };
      const { json } = stubJson(problem, status);
      const requests = [
        new EmergenciasApi().getEmergencia(23),
        new EmergenciasApi().resolverAfectado(23, 41, resolverCanceladoDto),
        new EmergenciasApi().retirarEmergencia(23),
      ];

      for (const request of requests) {
        const error = await captureApiError(request);
        expect(error.status).toBe(status);
        expect(error.problem).toBe(problem);
        expect(error.message).toBe(problem.detail);
      }
      expect(json).toHaveBeenCalledTimes(requests.length);
    },
  );

  it("rechaza un error 403 con forma de framework y usa el fallback", async () => {
    stubJson({ statusCode: 403, message: "Forbidden resource", error: "Forbidden" }, 403);

    const error = await captureApiError(new EmergenciasApi().getEmergencias());

    expect(error.status).toBe(403);
    expect(error.problem).toBeNull();
    expect(error.message).toBe("La API respondió con HTTP 403.");
  });

  const parseError = new SyntaxError("Unexpected token");
  const invalidErrorCases: Array<{
    label: string;
    status: number;
    json: ReturnType<typeof vi.fn>;
    cause?: unknown;
  }> = [
    {
      label: "campo malformado",
      status: 400,
      json: vi.fn().mockResolvedValue({
        type: "validation",
        title: "Inválido",
        status: 400,
        detail: 3,
        code: "VALIDATION_ERROR",
      }),
    },
    {
      label: "cuerpo parcial",
      status: 404,
      json: vi.fn().mockResolvedValue({ title: "No encontrado", status: 404 }),
    },
    {
      label: "status del cuerpo distinto",
      status: 409,
      json: vi.fn().mockResolvedValue({
        type: "conflict",
        title: "Conflicto",
        status: 400,
        detail: "No coincide",
        code: "CONFLICT",
      }),
    },
    {
      label: "cuerpo no JSON",
      status: 502,
      json: vi.fn().mockRejectedValue(parseError),
      cause: parseError,
    },
  ];

  it.each(invalidErrorCases)(
    "usa fallback y conserva HTTP para $label",
    async ({ status, json, cause }) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status, json }));

      const error = await captureApiError(new EmergenciasApi().getEmergencias());

      expect(error.status).toBe(status);
      expect(error.problem).toBeNull();
      expect(error.message).toBe(`La API respondió con HTTP ${status}.`);
      expect(json).toHaveBeenCalledTimes(1);
      if (cause) expect(error.cause).toBe(cause);
    },
  );

  it("tipa como ApiError una respuesta 2xx con JSON inválido", async () => {
    const cause = new SyntaxError("Unexpected end of JSON input");
    const json = vi.fn().mockRejectedValue(cause);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json }));

    const error = await captureApiError(new EmergenciasApi().getEmergencias());

    expect(error.status).toBe(200);
    expect(error.problem).toBeNull();
    expect(error.message).toBe("La API devolvió una respuesta JSON inválida.");
    expect(error.cause).toBe(cause);
    expect(json).toHaveBeenCalledTimes(1);
  });

  it("tipa un rechazo de red y conserva la causa", async () => {
    const cause = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(cause));

    const error = await captureApiError(new EmergenciasApi().getEmergencias());

    expect(error.status).toBeNull();
    expect(error.problem).toBeNull();
    expect(error.message).toBe("No se pudo conectar con la API.");
    expect(error.cause).toBe(cause);
  });
});
