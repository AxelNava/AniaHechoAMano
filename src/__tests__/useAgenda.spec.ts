import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BloqueoDto } from "@/types/disponibilidad/agendaDto";

const { deleteBloqueo, getBloqueos, getConfig, toastError, toastSuccess } = vi.hoisted(() => ({
  deleteBloqueo: vi.fn(),
  getBloqueos: vi.fn(),
  getConfig: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/services/disponibilidad/disponibilidadApi", () => ({
  disponibilidadApi: {
    createBloqueo: vi.fn(),
    deleteBloqueo,
    getBloqueos,
    getConfig,
    updateConfig: vi.fn(),
  },
}));

vi.mock("vue-sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));

import { useAgenda } from "@/composables/agenda/useAgenda";

describe("useAgenda", () => {
  beforeEach(() => {
    deleteBloqueo.mockReset().mockResolvedValue(undefined);
    getBloqueos.mockReset();
    getConfig.mockReset().mockResolvedValue(null);
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  it("separa el CRUD manual sin perder días de emergencia resaltados", async () => {
    const manual: BloqueoDto = {
      id: 7,
      fecha: "2026-08-20",
      tipo: "PERSONAL",
      motivo: "Asunto personal",
      creado_en: "2026-08-16T12:00:00.000Z",
      origen: "MANUAL",
      emergencia_id: null,
      eliminable_individualmente: true,
    };
    const emergencia: BloqueoDto = {
      id: 7,
      fecha: "2026-08-21",
      tipo: "EMERGENCIA",
      motivo: "Cierre urgente",
      creado_en: "2026-08-16T13:00:00.000Z",
      origen: "EMERGENCIA",
      emergencia_id: 7,
      eliminable_individualmente: false,
    };
    getBloqueos.mockResolvedValue([manual, emergencia]);
    const agenda = useAgenda();

    await agenda.cargarTodo();

    expect(agenda.diasBloqueados.value).toEqual([manual.fecha, emergencia.fecha]);
    expect(agenda.bloqueos.value).toEqual([manual]);
    expect(agenda.bloqueosPorFecha.value.get(manual.fecha)).toEqual(manual);
    expect(agenda.bloqueosPorFecha.value.has(emergencia.fecha)).toBe(false);

    await expect(agenda.eliminarBloqueo(emergencia)).resolves.toBe(false);
    expect(deleteBloqueo).not.toHaveBeenCalled();

    await expect(agenda.eliminarBloqueo(manual)).resolves.toBe(true);
    expect(deleteBloqueo).toHaveBeenCalledOnce();
    expect(deleteBloqueo).toHaveBeenCalledWith(manual.id);
  });
});
