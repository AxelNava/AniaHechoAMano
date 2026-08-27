import { afterEach, describe, expect, it, vi } from "vitest";
import { DisponibilidadApi } from "@/services/disponibilidad/disponibilidadApi";

describe("DisponibilidadApi — impacto de bloqueo", () => {
  afterEach(() => {
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
      { method: "GET" },
    );
  });

  it("rechaza un error HTTP en lugar de devolver un impacto vacío", async () => {
    const json = vi.fn().mockResolvedValue({ detail: "No disponible" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json }));

    await expect(new DisponibilidadApi().getImpactoBloqueo("2026-08-21")).rejects.toThrow(
      "No disponible",
    );
    expect(json).toHaveBeenCalledOnce();
  });
});
