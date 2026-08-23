import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, shallowRef } from "vue";
import type {
  BloqueoEmergenciaDetalleDto,
  PedidoAfectadoDto,
} from "@/types/disponibilidad/emergenciaDto";
const {
  route,
  useEmergenciasMock,
  useDisponibilidadMock,
  RouterLinkStub,
  CheckboxStub,
  ButtonStub,
  DisponibilidadCalendarStub,
  DialogStub,
  SlotStub,
} = vi.hoisted(() => {
  const SlotStub = { template: "<div><slot /></div>" };
  return {
    route: { params: { id: "7" } },
    useEmergenciasMock: vi.fn(),
    useDisponibilidadMock: vi.fn(),
    RouterLinkStub: {
      name: "RouterLink",
      props: { to: { type: [String, Object], required: true } },
      template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
    },
    CheckboxStub: {
      name: "Checkbox",
      props: { id: String, checked: Boolean, disabled: Boolean },
      emits: ["update:checked"],
      template:
        '<input :id="id" type="checkbox" :checked="checked" :disabled="disabled" @change="$emit(\'update:checked\', $event.target.checked)" />',
    },
    ButtonStub: {
      name: "Button",
      props: { disabled: Boolean },
      emits: ["click"],
      template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    DisponibilidadCalendarStub: {
      name: "DisponibilidadCalendar",
      props: {
        mesVisible: String,
        fechaSeleccionada: { type: String, default: null },
        diasDisponibles: { type: Array, default: () => [] },
        diasDeshabilitados: { type: Array, default: () => [] },
        minFecha: String,
      },
      emits: ["update:fechaSeleccionada", "update:mesVisible"],
      template:
        '<div data-calendar :data-min-date="minFecha" :data-dias-disponibles="diasDisponibles.join(\',\')" :data-dias-deshabilitados="diasDeshabilitados.join(\',\')"><button type="button" data-calendar-date="2026-08-22" @click="$emit(\'update:fechaSeleccionada\', \'2026-08-22\')">2026-08-22</button></div>',
    },
    DialogStub: {
      name: "Dialog",
      props: { open: Boolean },
      emits: ["update:open"],
      template: '<div v-if="open" data-dialog><slot /></div>',
    },
    SlotStub,
  };
});
vi.mock("vue-router", () => ({ RouterLink: RouterLinkStub, useRoute: () => route }));
vi.mock("@/components/ui/checkbox", () => ({ Checkbox: CheckboxStub }));
vi.mock("@/components/ui/button", () => ({ Button: ButtonStub }));
vi.mock("@/components/ui/calendar", () => ({
  DisponibilidadCalendar: DisponibilidadCalendarStub,
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: DialogStub,
  DialogContent: SlotStub,
  DialogDescription: SlotStub,
  DialogFooter: SlotStub,
  DialogHeader: SlotStub,
  DialogTitle: SlotStub,
}));
vi.mock("@/composables/agenda/useBloqueosEmergencia", () => ({
  useBloqueosEmergencia: useEmergenciasMock,
}));
vi.mock("@/composables/pedido/useDisponibilidad", () => ({
  useDisponibilidad: useDisponibilidadMock,
}));
import EmergenciaDetalleView from "@/views/EmergenciaDetalleView.vue";
const makeAfectado = (
  id: number,
  options: {
    contactado?: boolean;
    social?: string | null;
    phone?: string | null;
    original?: string;
    nuevaFecha?: string | null;
    resolucion?: PedidoAfectadoDto["resolucion"];
    estado?: PedidoAfectadoDto["estado_pedido"];
    tiempoTotalMinutos?: number;
  } = {},
): PedidoAfectadoDto => ({
  id,
  pedido_id: id * 10,
  referencia_publica: `PED-${id}`,
  estado_pedido: options.estado ?? "CONFIRMADO",
  fecha_entrega_original: options.original ?? "2026-08-20",
  contactado: options.contactado ?? false,
  contactado_en: null,
  resolucion: options.resolucion === undefined ? "RETRASADO" : options.resolucion,
  resuelto_en: null,
  nueva_fecha: options.nuevaFecha === undefined ? "2026-08-25" : options.nuevaFecha,
  tiempo_total_minutos: options.tiempoTotalMinutos ?? 45,
  cliente: {
    id,
    nombre: `Cliente ${id}`,
    telefono: options.phone ?? null,
    tipo_red_social: options.social ? "FACEBOOK" : null,
    url_perfil: null,
    red_social_contacto: options.social ?? null,
  },
});
const makeDetail = (
  afectados = [makeAfectado(11)],
  options: { activo?: boolean } = {},
): BloqueoEmergenciaDetalleDto => ({
  id: 7,
  desde: "2026-08-20",
  hasta: "2026-08-22",
  motivo: "Corte de luz",
  activo: options.activo ?? true,
  creado_en: "2026-08-17T09:00:00Z",
  retirado_en: null,
  total_afectados: afectados.length,
  pendientes_contacto: afectados.filter((afectado) => !afectado.contactado).length,
  pendientes_resolucion: afectados.length,
  dias_bloqueados: ["2026-08-20", "2026-08-21"],
  dias_con_bloqueo_manual: ["2026-08-21"],
  afectados,
});
const createDisponibilidad = (
  options: {
    minFecha?: string;
    diasDisponibles?: string[];
    diasDeshabilitados?: string[];
  } = {},
) => ({
  mesVisible: shallowRef("2026-08"),
  minFecha: shallowRef(options.minFecha ?? "2026-08-17"),
  diasDisponibles: shallowRef(options.diasDisponibles ?? ["2026-08-21", "2026-08-22"]),
  diasDeshabilitados: shallowRef(options.diasDeshabilitados ?? ["2026-08-23"]),
  cargandoMes: shallowRef(false),
  evaluarFecha: vi.fn().mockResolvedValue(undefined),
  recargar: vi.fn().mockResolvedValue(undefined),
});
const createState = (data: BloqueoEmergenciaDetalleDto | null, loading = false) => ({
  detalle: shallowRef(data),
  cargandoDetalle: shallowRef(loading),
  contactosEnCurso: shallowRef<ReadonlySet<number>>(new Set()),
  resolucionesEnCurso: shallowRef<ReadonlySet<number>>(new Set()),
  retirando: shallowRef(false),
  cargarDetalle: vi.fn().mockResolvedValue(Boolean(data)),
  marcarContactado: vi.fn().mockResolvedValue(true),
  resolverAfectado: vi.fn().mockResolvedValue(true),
  retirarEmergencia: vi.fn().mockResolvedValue(true),
});
const mountView = (
  state = createState(makeDetail()),
  disponibilidad = createDisponibilidad(),
) => {
  useEmergenciasMock.mockReturnValue(state);
  useDisponibilidadMock.mockReturnValue(disponibilidad);
  return mount(EmergenciaDetalleView);
};
const findButton = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll("button").find((button) => button.text().includes(text));
describe("EmergenciaDetalleView", () => {
  beforeEach(() => {
    route.params.id = "7";
    vi.resetAllMocks();
  });
  it("carga el id numérico y renderiza el resumen de la emergencia", async () => {
    const state = createState(makeDetail());
    const wrapper = mountView(state);
    await flushPromises();
    expect(state.cargarDetalle).toHaveBeenCalledWith(7);
    expect(wrapper.text()).toContain("Detalle de emergencia");
    expect(wrapper.text()).toContain("Corte de luz");
    expect(wrapper.text()).toContain("Total afectados");
    expect(wrapper.text()).toContain("Días con bloqueo manual");
  });
  it("muestra estado de carga, no encontrado e id inválido", async () => {
    const loadingState = createState(null, true);
    const loading = mountView(loadingState);
    await nextTick();
    expect(loading.text()).toContain("Cargando emergencia");
    const missingState = createState(null);
    const missing = mountView(missingState);
    await nextTick();
    expect(missing.text()).toContain("No se encontró la emergencia");
    route.params.id = "no-es-numérico";
    const invalidState = createState(null);
    const invalid = mountView(invalidState);
    await nextTick();
    expect(invalid.text()).toContain("no es válido");
    expect(invalidState.cargarDetalle).not.toHaveBeenCalled();
  });
  it("muestra datos del afectado, fallback de contacto y enlace al pedido", async () => {
    const state = createState(
      makeDetail([makeAfectado(11, { social: "facebook/ana" }), makeAfectado(12, { phone: "555-0102" })]),
    );
    const wrapper = mountView(state);
    await nextTick();
    expect(wrapper.text()).toContain("Cliente 11");
    expect(wrapper.text()).toContain("facebook/ana");
    expect(wrapper.text()).toContain("555-0102");
    expect(wrapper.text()).toContain("Retrasado");
    expect(wrapper.text()).toContain("Fecha de entrega original");
    const pedidoLink = wrapper.findAll("[data-to]").find((link) =>
      link.attributes("data-to")?.includes("admin-order-detail"),
    );
    expect(JSON.parse(pedidoLink!.attributes("data-to")!)).toEqual({
      name: "admin-order-detail",
      params: { pedidoId: 110 },
    });
  });
  it("envía true y deshabilita solo el checkbox que está en curso", async () => {
    const state = createState(makeDetail([makeAfectado(11), makeAfectado(12)]));
    let resolve!: (value: boolean) => void;
    const pending = new Promise<boolean>((ok) => (resolve = ok));
    state.marcarContactado.mockImplementation(() => {
      state.contactosEnCurso.value = new Set([11]);
      return pending;
    });
    const wrapper = mountView(state);
    await nextTick();
    await wrapper.get("#contactado-11").setValue(true);
    await nextTick();
    expect(state.marcarContactado).toHaveBeenCalledWith(7, 11, { contactado: true });
    expect(wrapper.get("#contactado-11").attributes("disabled")).toBeDefined();
    expect(wrapper.get("#contactado-12").attributes("disabled")).toBeUndefined();
    resolve(true);
  });
  it("envía false al desmarcar un pedido contactado", async () => {
    const state = createState(makeDetail([makeAfectado(11, { contactado: true })]));
    const wrapper = mountView(state);
    await nextTick();
    await wrapper.get("#contactado-11").setValue(false);
    expect(state.marcarContactado).toHaveBeenCalledWith(7, 11, { contactado: false });
  });
  it("normaliza las fechas timestamp de los afectados", async () => {
    const state = createState(
      makeDetail(
        [
          makeAfectado(11, {
            original: "2026-08-20T00:00:00.000Z",
            nuevaFecha: "2026-08-25T00:00:00.000Z",
          }),
        ],
      ),
    );
    const wrapper = mountView(state);
    await nextTick();
    expect(wrapper.text()).toContain("20 de agosto de 2026");
    expect(wrapper.text()).toContain("25 de agosto de 2026");
    expect(wrapper.text()).not.toContain("Invalid Date");
  });
  it("muestra Resolver solo para afectados contactados sin resolución y deshabilita los que están en curso", async () => {
    const state = createState(
      makeDetail([
        makeAfectado(11, { contactado: true, resolucion: null }),
        makeAfectado(12, { contactado: false, resolucion: null }),
        makeAfectado(13, { contactado: true, resolucion: "OBSOLETO" }),
        makeAfectado(14, { contactado: true, resolucion: "CANCELADO" }),
        makeAfectado(15, { contactado: true, resolucion: null }),
      ]),
    );
    state.resolucionesEnCurso.value = new Set([11]);
    const wrapper = mountView(state);
    await nextTick();
    const resolverButtons = wrapper.findAll("button").filter((button) => button.text() === "Resolver");
    expect(resolverButtons).toHaveLength(2);
    expect(resolverButtons[0].attributes("disabled")).toBeDefined();
    expect(resolverButtons[1].attributes("disabled")).toBeUndefined();
  });
  it("confirma la cancelación con confirmación visible y el payload canónico", async () => {
    const state = createState(makeDetail([makeAfectado(11, { contactado: true, resolucion: null })]));
    const disponibilidad = createDisponibilidad();
    const wrapper = mountView(state, disponibilidad);
    await nextTick();
    await findButton(wrapper, "Resolver")!.trigger("click");
    expect(wrapper.text()).toContain("Cancelar pedido");
    await findButton(wrapper, "Cancelar pedido")!.trigger("click");
    expect(wrapper.text()).toContain("¿Confirmas la cancelación de este pedido?");
    expect(state.resolverAfectado).not.toHaveBeenCalled();
    await findButton(wrapper, "Confirmar cancelación")!.trigger("click");
    await flushPromises();
    expect(state.resolverAfectado).toHaveBeenCalledWith(7, 11, { resolucion: "CANCELADO" });
    expect(disponibilidad.recargar).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).not.toContain("¿Confirmas la cancelación de este pedido?");
  });
  it("cierra la elección con Decidir después y conserva el diálogo si falla el resolver", async () => {
    const state = createState(makeDetail([makeAfectado(11, { contactado: true, resolucion: null })]));
    state.resolverAfectado.mockResolvedValue(false);
    const disponibilidad = createDisponibilidad();
    const wrapper = mountView(state, disponibilidad);
    await nextTick();
    await findButton(wrapper, "Resolver")!.trigger("click");
    await findButton(wrapper, "Decidir después")!.trigger("click");
    expect(wrapper.text()).not.toContain("Puedes cancelar el pedido o desplazar");
    await findButton(wrapper, "Resolver")!.trigger("click");
    await findButton(wrapper, "Cancelar pedido")!.trigger("click");
    await findButton(wrapper, "Confirmar cancelación")!.trigger("click");
    await flushPromises();
    expect(disponibilidad.recargar).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("No se pudo resolver el pedido");
    expect(wrapper.find("[data-dialog]").exists()).toBe(true);
  });
  it("usa la fecha estrictamente posterior, la disponibilidad y el payload de desplazamiento", async () => {
    const state = createState(makeDetail([makeAfectado(11, { contactado: true, resolucion: null })]));
    const disponibilidad = createDisponibilidad({
      minFecha: "2026-08-19",
      diasDisponibles: ["2026-08-22"],
      diasDeshabilitados: ["2026-08-23"],
    });
    const wrapper = mountView(state, disponibilidad);
    await nextTick();
    await findButton(wrapper, "Resolver")!.trigger("click");
    await findButton(wrapper, "Desplazar entrega")!.trigger("click");
    await flushPromises();
    const calendar = wrapper.get("[data-calendar]");
    expect(calendar.attributes("data-min-date")).toBe("2026-08-21");
    expect(calendar.attributes("data-dias-disponibles")).toBe("2026-08-22");
    expect(calendar.attributes("data-dias-deshabilitados")).toBe("2026-08-23");
    expect(disponibilidad.recargar).toHaveBeenCalledTimes(1);
    expect(useDisponibilidadMock.mock.calls[0][0].value).toBe(45);
    await calendar.get("[data-calendar-date='2026-08-22']").trigger("click");
    await nextTick();
    await findButton(wrapper, "Confirmar desplazamiento")!.trigger("click");
    await flushPromises();
    expect(state.resolverAfectado).toHaveBeenCalledWith(7, 11, {
      resolucion: "RETRASADO",
      nueva_fecha: "2026-08-22",
    });
    expect(disponibilidad.recargar).toHaveBeenCalledTimes(2);
  });
  it("deshabilita el desplazamiento hasta elegir una fecha", async () => {
    const state = createState(makeDetail([makeAfectado(11, { contactado: true, resolucion: null })]));
    const wrapper = mountView(state);
    await nextTick();
    await findButton(wrapper, "Resolver")!.trigger("click");
    await findButton(wrapper, "Desplazar entrega")!.trigger("click");
    await flushPromises();
    expect(findButton(wrapper, "Confirmar desplazamiento")!.attributes("disabled")).toBeDefined();
    expect(state.resolverAfectado).not.toHaveBeenCalled();
  });
  it("guarda la emergencia inactiva y no ofrece acciones mutables", async () => {
    const state = createState(makeDetail([makeAfectado(11, { contactado: true })], { activo: false }));
    const wrapper = mountView(state);
    await nextTick();
    expect(wrapper.text()).not.toContain("Retirar emergencia");
    expect(wrapper.text()).not.toContain("Resolver");
    expect(wrapper.get("#contactado-11").attributes("disabled")).toBeDefined();
    await wrapper.get("#contactado-11").setValue(false);
    expect(state.marcarContactado).not.toHaveBeenCalled();
  });
  it("confirma la retirada y muestra el estado canónico", async () => {
    const state = createState(makeDetail());
    state.retirarEmergencia.mockImplementation(async () => {
      state.detalle.value = makeDetail([], { activo: false });
      return true;
    });
    const wrapper = mountView(state);
    await nextTick();
    await findButton(wrapper, "Retirar emergencia")!.trigger("click");
    expect(wrapper.text()).toContain("libera el bloque");
    expect(wrapper.text()).toContain("no deshace las resoluciones existentes");
    expect(state.retirarEmergencia).not.toHaveBeenCalled();
    await findButton(wrapper, "Confirmar retirada")!.trigger("click");
    await flushPromises();
    expect(state.retirarEmergencia).toHaveBeenCalledWith(7);
    expect(wrapper.text()).toContain("Retirada");
    expect(wrapper.text()).not.toContain("Retirar emergencia");
  });
});
