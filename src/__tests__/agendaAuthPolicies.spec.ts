import { afterEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/auth/authService";
import { ConfigApi } from "@/services/config/configApi";
import { DisponibilidadApi } from "@/services/disponibilidad/disponibilidadApi";
import { EmergenciasApi } from "@/services/disponibilidad/emergenciasApi";

vi.mock("@/auth/authService", () => ({
  authService: { getAccessToken: vi.fn() },
}));

const tokenMock = vi.mocked(authService.getAccessToken);
const config = new ConfigApi();
const disponibilidad = new DisponibilidadApi();
const emergencias = new EmergenciasApi();
const R = "required" as const;
const N = "none" as const;

type PolicyCase = [string, string, RegExp, typeof R | typeof N, () => Promise<unknown>];

const cases: PolicyCase[] = [
  ["contact config", "GET", /\/config\/contacto$/, N, () => config.getContacto()],
  [
    "availability days",
    "GET",
    /\/disponibilidad\/dias\?desde=2026-08-20&hasta=2026-08-22&minutos_estimados=30$/,
    N,
    () => disponibilidad.getDias("2026-08-20", "2026-08-22", 30),
  ],
  [
    "availability evaluation",
    "POST",
    /\/disponibilidad\/evaluar$/,
    N,
    () => disponibilidad.evaluar("2026-08-20", 30),
  ],
  ["agenda config read", "GET", /\/agenda\/config$/, R, () => disponibilidad.getConfig()],
  [
    "agenda config update",
    "PUT",
    /\/agenda\/config$/,
    R,
    () => disponibilidad.updateConfig({} as never),
  ],
  [
    "agenda block list",
    "GET",
    /\/agenda\/bloqueos\?desde=2026-08-20$/,
    R,
    () => disponibilidad.getBloqueos({ desde: "2026-08-20" }),
  ],
  [
    "agenda block impact",
    "GET",
    /\/agenda\/bloqueos\/impacto\?fecha=2026-08-20$/,
    R,
    () => disponibilidad.getImpactoBloqueo("2026-08-20"),
  ],
  [
    "agenda block create",
    "POST",
    /\/agenda\/bloqueos$/,
    R,
    () => disponibilidad.createBloqueo({} as never),
  ],
  [
    "agenda block delete",
    "DELETE",
    /\/agenda\/bloqueos\/7$/,
    R,
    () => disponibilidad.deleteBloqueo(7),
  ],
  [
    "emergency create",
    "POST",
    /\/agenda\/emergencias$/,
    R,
    () => emergencias.createEmergencia({} as never),
  ],
  ["emergency list", "GET", /\/agenda\/emergencias$/, R, () => emergencias.getEmergencias()],
  ["emergency detail", "GET", /\/agenda\/emergencias\/7$/, R, () => emergencias.getEmergencia(7)],
  [
    "emergency contact",
    "PATCH",
    /\/agenda\/emergencias\/7\/afectados\/8\/contactado$/,
    R,
    () => emergencias.marcarContactado(7, 8, { contactado: true }),
  ],
  [
    "emergency resolution",
    "POST",
    /\/agenda\/emergencias\/7\/afectados\/8\/resolver$/,
    R,
    () => emergencias.resolverAfectado(7, 8, { resolucion: "CANCELADO" }),
  ],
  [
    "emergency withdrawal",
    "POST",
    /\/agenda\/emergencias\/7\/retirar$/,
    R,
    () => emergencias.retirarEmergencia(7),
  ],
];

const protectedCases = cases.filter(([, , , auth]) => auth === R);

describe("contact, availability and agenda auth policies", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(cases)("uses the %s policy", async (_, method, path, auth, invoke) => {
    tokenMock.mockReset().mockResolvedValue("agenda-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue([]),
    });
    vi.stubGlobal("fetch", fetchMock);

    await invoke();

    const [url, options] = fetchMock.mock.calls[0];
    const headers = new Headers(options.headers);
    expect(String(url)).toMatch(path);
    expect(options.method).toBe(method);
    expect(headers.get("Authorization")).toBe(auth === R ? "Bearer agenda-token" : null);
    expect(tokenMock).toHaveBeenCalledTimes(auth === R ? 1 : 0);
  });

  it.each(protectedCases)(
    "rejects %s before fetch when the token is missing",
    async (_, ...rest) => {
      const invoke = rest.at(-1) as () => Promise<unknown>;
      tokenMock.mockReset().mockResolvedValue(null);
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      await expect(invoke()).rejects.toMatchObject({
        status: 401,
        problem: { code: "AUTHENTICATION_REQUIRED" },
      });
      expect(tokenMock).toHaveBeenCalledOnce();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
