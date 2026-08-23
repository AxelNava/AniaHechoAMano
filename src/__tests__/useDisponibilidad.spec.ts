import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import type { DiasDisponibilidadResponseDto } from "@/types/disponibilidad/disponibilidadDto";

const { evaluar, getDias } = vi.hoisted(() => ({
  evaluar: vi.fn(),
  getDias: vi.fn(),
}));

vi.mock("@/services/disponibilidad/disponibilidadApi", () => ({
  disponibilidadApi: { evaluar, getDias },
}));

import { useDisponibilidad } from "@/composables/pedido/useDisponibilidad";

const dia = (fecha: string, disponible: boolean) => ({ fecha, disponible, motivos: [] });
const respuesta = (
  dias: DiasDisponibilidadResponseDto["dias"],
): DiasDisponibilidadResponseDto => ({
  desde: "2026-08-17",
  hasta: "2026-08-31",
  min_fecha: "2026-08-17",
  dias_anticipacion_min: 0,
  capacidad_minutos_dia: 240,
  dias,
});

const settle = async () => {
  await nextTick();
  await Promise.resolve();
  await nextTick();
};

describe("useDisponibilidad", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 17, 12));
    getDias.mockReset();
    evaluar.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("carga el mes visible inicialmente y separa días disponibles y deshabilitados", async () => {
    getDias.mockResolvedValue(
      respuesta([dia("2026-08-18", true), dia("2026-08-19", false)]),
    );

    const disponibilidad = useDisponibilidad(90);
    await settle();

    expect(getDias).toHaveBeenCalledOnce();
    expect(getDias).toHaveBeenCalledWith("2026-08-17", "2026-08-31", 90);
    expect(disponibilidad.diasDisponibles.value).toEqual(["2026-08-18"]);
    expect(disponibilidad.diasDeshabilitados.value).toEqual(["2026-08-19"]);
    expect(disponibilidad.minFecha.value).toBe("2026-08-17");
  });

  it("recargar invalida la caché, limpia la evaluación y vuelve a pedir el mismo mes", async () => {
    getDias
      .mockResolvedValueOnce(
        respuesta([dia("2026-08-18", true), dia("2026-08-19", false)]),
      )
      .mockResolvedValueOnce(
        respuesta([dia("2026-08-20", true), dia("2026-08-21", false)]),
      );
    evaluar.mockResolvedValue({ disponible: false, motivos: ["ocupado"], sugerencias: [] });

    const disponibilidad = useDisponibilidad(60);
    await settle();
    const evaluacion = disponibilidad.evaluarFecha("2026-08-19");
    await vi.advanceTimersByTimeAsync(300);
    await evaluacion;
    expect(disponibilidad.evaluacion.value?.disponible).toBe(false);

    await expect(disponibilidad.recargar()).resolves.toBeUndefined();

    expect(getDias).toHaveBeenCalledTimes(2);
    expect(getDias).toHaveBeenNthCalledWith(2, "2026-08-17", "2026-08-31", 60);
    expect(disponibilidad.diasDisponibles.value).toEqual(["2026-08-20"]);
    expect(disponibilidad.diasDeshabilitados.value).toEqual(["2026-08-21"]);
    expect(disponibilidad.evaluacion.value).toBeNull();
  });

  it("conserva las claves de caché separadas por mes y minutos", async () => {
    getDias.mockResolvedValue(respuesta([]));
    const minutos = ref(60);
    const disponibilidad = useDisponibilidad(minutos);
    await settle();

    disponibilidad.mesVisible.value = "2026-09";
    await settle();
    disponibilidad.mesVisible.value = "2026-08";
    await settle();
    expect(getDias).toHaveBeenCalledTimes(2);
    expect(getDias).toHaveBeenNthCalledWith(2, "2026-09-01", "2026-09-30", 60);

    minutos.value = 90;
    await settle();
    expect(getDias).toHaveBeenNthCalledWith(3, "2026-08-17", "2026-08-31", 90);

    disponibilidad.mesVisible.value = "2026-09";
    await settle();
    expect(getDias).toHaveBeenNthCalledWith(4, "2026-09-01", "2026-09-30", 90);
  });
});
