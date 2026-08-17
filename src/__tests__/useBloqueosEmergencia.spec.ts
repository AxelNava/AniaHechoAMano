import { beforeEach, describe, expect, it, vi } from "vitest";
import { toRaw } from "vue";
import { ApiError } from "@/services/http/apiClient";
import type {
  BloqueoEmergenciaDetalleDto,
  BloqueoEmergenciaListItemDto,
  PedidoAfectadoDto,
} from "@/types/disponibilidad/emergenciaDto";

const { api, toastError, toastSuccess } = vi.hoisted(() => ({
  api: {
    createEmergencia: vi.fn(),
    getEmergencias: vi.fn(),
    getEmergencia: vi.fn(),
    marcarContactado: vi.fn(),
  },
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));
vi.mock("@/services/disponibilidad/emergenciasApi", () => ({ emergenciasApi: api }));
vi.mock("vue-sonner", () => ({ toast: { error: toastError, success: toastSuccess } }));
import { useBloqueosEmergencia } from "@/composables/agenda/useBloqueosEmergencia";
const diferida = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
};

const afectado = (id: number, contactado = false): PedidoAfectadoDto => ({
  id,
  pedido_id: id * 10,
  referencia_publica: null,
  estado_pedido: null,
  fecha_entrega_original: "2026-08-20",
  contactado,
  contactado_en: contactado ? "2026-08-17T10:00:00Z" : null,
  resolucion: null,
  resuelto_en: null,
  nueva_fecha: null,
  tiempo_total_minutos: 30,
  cliente: {
    id,
    nombre: `Cliente ${id}`,
    telefono: null,
    tipo_red_social: null,
    url_perfil: null,
    red_social_contacto: null,
  },
});
const item = (id: number, pendientes = 0, total = 2): BloqueoEmergenciaListItemDto => ({
  id,
  desde: "2026-08-20",
  hasta: "2026-08-21",
  motivo: null,
  activo: true,
  creado_en: "2026-08-17T09:00:00Z",
  retirado_en: null,
  total_afectados: total,
  pendientes_contacto: pendientes,
  pendientes_resolucion: total,
});
const detalle = (id = 1, afectados = [afectado(11)]): BloqueoEmergenciaDetalleDto => ({
  ...item(id, afectados.filter(({ contactado }) => !contactado).length, afectados.length),
  dias_bloqueados: ["2026-08-20"],
  dias_con_bloqueo_manual: [],
  afectados,
});
const cargarEstado = async (
  data = detalle(),
  lista = [item(data.id, data.pendientes_contacto, data.total_afectados)],
) => {
  api.getEmergencia.mockResolvedValue(data);
  api.getEmergencias.mockResolvedValue(lista);
  const estado = useBloqueosEmergencia();
  await Promise.all([estado.cargarDetalle(data.id), estado.cargarEmergencias()]);
  return estado;
};
describe("useBloqueosEmergencia", () => {
  beforeEach(() => vi.resetAllMocks());
  it("mantiene lecturas independientes, latest-wins y mensajes de error", async () => {
    const l1 = diferida<BloqueoEmergenciaListItemDto[]>();
    const l2 = diferida<BloqueoEmergenciaListItemDto[]>();
    const d1 = diferida<BloqueoEmergenciaDetalleDto>();
    const d2 = diferida<BloqueoEmergenciaDetalleDto>();
    api.getEmergencias.mockReturnValueOnce(l1.promise).mockReturnValueOnce(l2.promise);
    api.getEmergencia.mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise);
    const estado = useBloqueosEmergencia();
    const otraInstancia = useBloqueosEmergencia();
    const primeraLista = estado.cargarEmergencias();
    const ultimaLista = estado.cargarEmergencias();
    const primerDetalle = estado.cargarDetalle(1);
    const ultimoDetalle = estado.cargarDetalle(2);
    expect([estado.cargandoLista.value, estado.cargandoDetalle.value]).toEqual([true, true]);
    expect(estado.detalle.value).toBeNull();
    l2.resolve([item(2)]);
    await expect(ultimaLista).resolves.toBe(true);
    expect([estado.cargandoLista.value, estado.cargandoDetalle.value]).toEqual([false, true]);
    d2.resolve(detalle(2));
    await expect(ultimoDetalle).resolves.toBe(true);
    l1.resolve([item(1)]);
    d1.reject(new ApiError("No mostrar", 500, null));
    await expect(Promise.all([primeraLista, primerDetalle])).resolves.toEqual([false, false]);
    expect(estado.emergencias.value).toEqual([item(2)]);
    expect(estado.detalle.value?.id).toBe(2);
    expect(otraInstancia.emergencias.value).toEqual([]);
    expect(toastError).not.toHaveBeenCalled();
    api.getEmergencias.mockRejectedValueOnce(new ApiError("Detalle visible", 409, null));
    await expect(estado.cargarEmergencias()).resolves.toBe(false);
    api.getEmergencias.mockRejectedValueOnce(new Error("interno"));
    await expect(estado.cargarEmergencias()).resolves.toBe(false);
    api.getEmergencia.mockRejectedValueOnce("inesperado");
    await expect(estado.cargarDetalle(1)).resolves.toBe(false);
    expect(toastError.mock.calls.map(([mensaje]) => mensaje)).toEqual([
      "Detalle visible",
      "No se pudieron cargar las emergencias.",
      "No se pudo cargar la emergencia.",
    ]);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("crea con upsert canónico y preserva estado ante fallo y single-flight", async () => {
    const estado = await cargarEstado(detalle(1), [item(9), item(1, 1)]);
    const pendiente = diferida<BloqueoEmergenciaDetalleDto>();
    const creada = detalle(1, [afectado(11, true)]);
    api.createEmergencia.mockReturnValueOnce(pendiente.promise);
    const primera = estado.crearEmergencia({ desde: "2026-08-20", hasta: "2026-08-21" });
    await expect(estado.crearEmergencia({ desde: "x", hasta: "y" })).resolves.toBeNull();
    expect(api.createEmergencia).toHaveBeenCalledOnce();
    pendiente.resolve(creada);
    await expect(primera).resolves.toBe(creada);
    expect(estado.emergencias.value).toEqual([item(9), item(1, 0, 1)]);
    expect(toRaw(estado.detalle.value)).toBe(creada);
    expect(toastSuccess).toHaveBeenCalledWith("Emergencia creada.");
    const listaPrevia = estado.emergencias.value;
    api.createEmergencia.mockRejectedValueOnce(new Error("interno"));
    await expect(estado.crearEmergencia({ desde: "x", hasta: "y" })).resolves.toBeNull();
    expect(estado.emergencias.value).toBe(listaPrevia);
    expect(toRaw(estado.detalle.value)).toBe(creada);
    expect(toastError).toHaveBeenLastCalledWith("No se pudo crear la emergencia.");
  });

  it("sincroniza contacto canónico, timestamp y guards bidireccionales", async () => {
    const estado = await cargarEstado(detalle(1, [afectado(11)]), [item(1, 1)]);
    const alta = diferida<PedidoAfectadoDto>();
    api.marcarContactado.mockReturnValueOnce(alta.promise);
    const guardado = estado.marcarContactado(1, 11, { contactado: true });
    expect(estado.detalle.value?.afectados[0].contactado).toBe(true);
    expect(estado.detalle.value?.afectados[0].contactado_en).toBeNull();
    expect(estado.detalle.value?.pendientes_contacto).toBe(0);
    expect(estado.hayContactosEnCurso.value).toBe(true);
    const canonico = { ...afectado(11, true), contactado_en: "servidor" };
    alta.resolve(canonico);
    await expect(guardado).resolves.toBe(true);
    expect(estado.detalle.value?.afectados[0]).toEqual(canonico);
    expect(estado.contactosEnCurso.value.size).toBe(0);
    const baja = diferida<PedidoAfectadoDto>();
    api.marcarContactado.mockReturnValueOnce(baja.promise);
    const desmarcado = estado.marcarContactado(1, 11, { contactado: false });
    expect(estado.detalle.value?.afectados[0].contactado_en).toBeNull();
    expect(estado.detalle.value?.pendientes_contacto).toBe(1);
    baja.resolve(afectado(11));
    await expect(desmarcado).resolves.toBe(true);
    expect(estado.emergencias.value[0].pendientes_contacto).toBe(1);

    const contacto = diferida<PedidoAfectadoDto>();
    api.marcarContactado.mockReturnValueOnce(contacto.promise);
    const cambio = estado.marcarContactado(1, 11, { contactado: true });
    const lecturas = [api.getEmergencias, api.getEmergencia, api.createEmergencia];
    lecturas.forEach((mock) => mock.mockClear());
    await expect(
      Promise.all([
        estado.cargarEmergencias(),
        estado.cargarDetalle(2),
        estado.crearEmergencia({ desde: "x", hasta: "y" }),
      ]),
    ).resolves.toEqual([false, false, null]);
    for (const mock of lecturas) expect(mock).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
    contacto.resolve(afectado(11, true));
    await cambio;

    api.marcarContactado.mockClear();
    const bloqueos = [
      [api.getEmergencias, () => estado.cargarEmergencias()],
      [api.getEmergencia, () => estado.cargarDetalle(1)],
      [api.createEmergencia, () => estado.crearEmergencia({ desde: "x", hasta: "y" })],
    ] as const;
    for (const [mock, iniciar] of bloqueos) {
      const espera = diferida<never>();
      mock.mockReturnValueOnce(espera.promise);
      const operacion = iniciar();
      await expect(estado.marcarContactado(1, 11, { contactado: false })).resolves.toBe(false);
      expect(api.marcarContactado).not.toHaveBeenCalled();
      espera.reject(new Error("fin"));
      await operacion;
    }
    expect(toastError).toHaveBeenCalledTimes(3);
  });

  it("suprime duplicados y conserva otro éxito cuando una fila revierte", async () => {
    const original = afectado(11);
    const estado = await cargarEstado(detalle(1, [original, afectado(12)]), [item(1, 2)]);
    const falla = diferida<PedidoAfectadoDto>();
    const exito = diferida<PedidoAfectadoDto>();
    api.marcarContactado.mockReturnValueOnce(falla.promise).mockReturnValueOnce(exito.promise);
    const uno = estado.marcarContactado(1, 11, { contactado: true });
    await expect(estado.marcarContactado(1, 11, { contactado: true })).resolves.toBe(false);
    const dos = estado.marcarContactado(1, 12, { contactado: true });
    expect(api.marcarContactado).toHaveBeenCalledTimes(2);
    const canonico = { ...afectado(12, true), contactado_en: "canonico" };
    exito.resolve(canonico);
    await expect(dos).resolves.toBe(true);
    falla.reject(new ApiError("No autorizado", 409, null));
    await expect(uno).resolves.toBe(false);
    expect(estado.detalle.value?.afectados).toEqual([original, canonico]);
    expect(toRaw(estado.detalle.value?.afectados[0])).toBe(original);
    expect(estado.detalle.value?.pendientes_contacto).toBe(1);
    expect(estado.detalle.value?.pendientes_resolucion).toBe(2);
    expect(estado.emergencias.value[0].pendientes_contacto).toBe(1);
    expect(toastError).toHaveBeenLastCalledWith("No autorizado");
    await expect(estado.marcarContactado(1, 12, { contactado: true })).resolves.toBe(true);
    await expect(estado.marcarContactado(1, 99, { contactado: true })).resolves.toBe(false);
    expect(api.marcarContactado).toHaveBeenCalledTimes(2);
  });
});
