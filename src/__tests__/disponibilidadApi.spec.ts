import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/auth/authService";
import { DisponibilidadApi } from "@/services/disponibilidad/disponibilidadApi";

vi.mock("@/auth/authService", () => ({
  authService: { getAccessToken: vi.fn() },
}));

const tokenMock = vi.mocked(authService.getAccessToken);

describe("DisponibilidadApi — impacto de bloqueo", () => {
  beforeEach(() => tokenMock.mockResolvedValue("agenda-token"));

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("consulta el impacto por día y conserva el DTO", async () => {
    const impacto = {
      fecha: "2026-08-20",
      total_pedidos_afectados: 3,
      clientes_unicos_afectados: 2,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(impacto),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(new DisponibilidadApi().getImpactoBloqueo(impacto.fecha)).resolves.toBe(impacto);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/agenda\/bloqueos\/impacto\?fecha=2026-08-20$/),
      { method: "GET", headers: { Authorization: "Bearer agenda-token" } },
    );
  });

  it("preserva ProblemDetails al rechazar un error HTTP", async () => {
    const problem = {
      type: "https://ania.test/problems/database",
      title: "No disponible",
      status: 503,
      detail: "No disponible",
      code: "DATABASE_ERROR",
    };
    const json = vi.fn().mockResolvedValue(problem);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json }));

    await expect(new DisponibilidadApi().getImpactoBloqueo("2026-08-21")).rejects.toMatchObject({
      message: "No disponible",
      status: 503,
      problem,
    });
    expect(json).toHaveBeenCalledOnce();
  });
});
