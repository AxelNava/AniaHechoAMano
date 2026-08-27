import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BloqueoDto, ImpactoBloqueoDto } from "@/types/disponibilidad/agendaDto";

const {
  createBloqueo,
  deleteBloqueo,
  getBloqueos,
  getConfig,
  getImpactoBloqueo,
  toastError,
  toastSuccess,
} = vi.hoisted(() => ({
  createBloqueo: vi.fn(),
  deleteBloqueo: vi.fn(),
  getBloqueos: vi.fn(),
  getConfig: vi.fn(),
  getImpactoBloqueo: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/services/disponibilidad/disponibilidadApi", () => ({
  disponibilidadApi: {
    createBloqueo,
    deleteBloqueo,
    getBloqueos,
    getConfig,
    getImpactoBloqueo,
    updateConfig: vi.fn(),
  },
}));

vi.mock("vue-sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));

import { useAgenda } from "@/composables/agenda/useAgenda";

const crearBloqueo = (overrides: Partial<BloqueoDto>): BloqueoDto => ({
  id: 1,
  fecha: "2026-08-20",
  tipo: "PERSONAL",
  motivo: null,
  creado_en: "2026-08-16T12:00:00.000Z",
  origen: "MANUAL",
  emergencia_id: null,
  eliminable_individualmente: true,
  ...overrides,
});

const crearImpacto = (overrides: Partial<ImpactoBloqueoDto> = {}): ImpactoBloqueoDto => ({
  fecha: "2026-08-20",
  total_pedidos_afectados: 0,
  clientes_unicos_afectados: 0,
  ...overrides,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useAgenda", () => {
  beforeEach(() => {
    createBloqueo.mockReset().mockResolvedValue(undefined);
    deleteBloqueo.mockReset().mockResolvedValue(undefined);
    getBloqueos.mockReset().mockResolvedValue([]);
    getConfig.mockReset().mockResolvedValue(null);
    getImpactoBloqueo.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  it("separa el CRUD manual, conserva emergencias y ordena la lista manual antes de emergencia", async () => {
    const manualTarde = crearBloqueo({ id: 7, fecha: "2026-08-22" });
    const emergenciaTemprana = crearBloqueo({
      id: 8,
      fecha: "2026-08-18",
      tipo: "EMERGENCIA",
      origen: "EMERGENCIA",
      emergencia_id: 4,
      eliminable_individualmente: false,
    });
    const manualTemprano = crearBloqueo({ id: 9, fecha: "2026-08-20" });
    getBloqueos.mockResolvedValue([manualTarde, emergenciaTemprana, manualTemprano]);
    const agenda = useAgenda();

    await agenda.cargarTodo();

    expect(agenda.diasBloqueados.value).toEqual([
      manualTarde.fecha,
      emergenciaTemprana.fecha,
      manualTemprano.fecha,
    ]);
    expect(agenda.bloqueos.value).toEqual([manualTarde, manualTemprano]);
    expect(agenda.bloqueosParaLista.value).toEqual([
      manualTemprano,
      manualTarde,
      emergenciaTemprana,
    ]);
    expect(agenda.bloqueosPorFecha.value.get(manualTarde.fecha)).toEqual(manualTarde);
    expect(agenda.bloqueosPorFecha.value.has(emergenciaTemprana.fecha)).toBe(false);

    await expect(agenda.eliminarBloqueo(emergenciaTemprana)).resolves.toBe(false);
    expect(deleteBloqueo).not.toHaveBeenCalled();

    await expect(agenda.eliminarBloqueo(manualTarde)).resolves.toBe(true);
    expect(deleteBloqueo).toHaveBeenCalledWith(manualTarde.id);
  });

  it("conserva el impacto positivo y también permite distinguir el caso sin clientes", async () => {
    const positivo = crearImpacto({
      total_pedidos_afectados: 3,
      clientes_unicos_afectados: 2,
    });
    getImpactoBloqueo
      .mockResolvedValueOnce(positivo)
      .mockResolvedValueOnce(crearImpacto({ fecha: "2026-08-21" }));
    const agenda = useAgenda();

    await expect(agenda.consultarImpactoBloqueo("2026-08-20")).resolves.toBe(true);
    expect(agenda.impactoBloqueo.value).toEqual(positivo);
    expect(agenda.errorImpactoBloqueo.value).toBe("");

    await expect(agenda.consultarImpactoBloqueo("2026-08-21")).resolves.toBe(true);
    expect(agenda.impactoBloqueo.value).toEqual(crearImpacto({ fecha: "2026-08-21" }));
    expect(agenda.impactoBloqueo.value?.clientes_unicos_afectados).toBe(0);
  });

  it("no deja que una respuesta vieja reemplace el día actualmente consultado", async () => {
    const primera = deferred<ImpactoBloqueoDto>();
    const segunda = deferred<ImpactoBloqueoDto>();
    getImpactoBloqueo.mockImplementation((fecha: string) =>
      fecha === "2026-08-20" ? primera.promise : segunda.promise,
    );
    const agenda = useAgenda();

    const consultaAnterior = agenda.consultarImpactoBloqueo("2026-08-20");
    const consultaActual = agenda.consultarImpactoBloqueo("2026-08-21");
    segunda.resolve(
      crearImpacto({
        fecha: "2026-08-21",
        total_pedidos_afectados: 1,
        clientes_unicos_afectados: 1,
      }),
    );
    await consultaActual;
    primera.resolve(
      crearImpacto({
        fecha: "2026-08-20",
        total_pedidos_afectados: 8,
        clientes_unicos_afectados: 8,
      }),
    );
    await consultaAnterior;

    expect(agenda.impactoBloqueo.value).toEqual(
      crearImpacto({
        fecha: "2026-08-21",
        total_pedidos_afectados: 1,
        clientes_unicos_afectados: 1,
      }),
    );
    expect(agenda.cargandoImpactoBloqueo.value).toBe(false);
  });

  it("expone el error del impacto sin convertirlo en cero", async () => {
    getImpactoBloqueo.mockRejectedValue(new Error("Servicio no disponible"));
    const agenda = useAgenda();

    await expect(agenda.consultarImpactoBloqueo("2026-08-20")).resolves.toBe(false);

    expect(agenda.impactoBloqueo.value).toBeNull();
    expect(agenda.errorImpactoBloqueo.value).toBe("Servicio no disponible");
    expect(agenda.cargandoImpactoBloqueo.value).toBe(false);
  });
});
