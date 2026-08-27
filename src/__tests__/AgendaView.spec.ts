import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { computed, reactive, ref } from "vue";
import type { ImpactoBloqueoDto } from "@/types/disponibilidad/agendaDto";
import type { BloqueoEmergenciaListItemDto } from "@/types/disponibilidad/emergenciaDto";
import { formatDiaISO } from "@/utils/orderDisplay";

const { useAgendaMock, useEmergenciasMock } = vi.hoisted(() => ({
  useAgendaMock: vi.fn(),
  useEmergenciasMock: vi.fn(),
}));

vi.mock("@/composables/agenda/useAgenda", () => ({
  useAgenda: useAgendaMock,
  TIPO_BLOQUEO_LABELS: {
    FERIADO: "Feriado",
    PERSONAL: "Personal",
    OCUPADO: "Ocupado",
  },
}));
vi.mock("@/composables/agenda/useBloqueosEmergencia", () => ({
  useBloqueosEmergencia: useEmergenciasMock,
}));

import AgendaView from "@/views/AgendaView.vue";

const InputStub = {
  props: {
    id: String,
    modelValue: [String, Number],
    type: String,
    required: Boolean,
  },
  emits: ["update:modelValue"],
  template:
    '<input :id="id" :type="type" :value="modelValue" :required="required" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};
const TextareaStub = {
  props: { id: String, modelValue: [String, Number] },
  emits: ["update:modelValue"],
  template:
    '<textarea :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};
const ButtonStub = {
  props: { disabled: Boolean, type: String },
  template: '<button :type="type" :disabled="disabled"><slot /></button>',
};
const LabelStub = {
  template: "<label><slot /></label>",
};
const SlotStub = { template: "<div><slot /></div>" };
const CalendarStub = {
  emits: ["update:fecha-seleccionada"],
  template:
    '<button type="button" data-test="calendar-day" @click="$emit(\'update:fecha-seleccionada\', \'2026-08-20\')">Seleccionar día</button>',
};
const DialogStub = {
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
};
const RouterLinkStub = {
  template: "<a><slot /></a>",
};
const ChevronDownStub = {
  template: "<span />",
};

const createAgendaState = (overrides: Record<string, unknown> = {}) => ({
  config: ref(null),
  form: reactive({ capacidad_minutos_dia: 480, dias_anticipacion_min: 2 }),
  cargandoConfig: ref(false),
  guardandoConfig: ref(false),
  guardarConfig: vi.fn().mockResolvedValue(undefined),
  mesVisible: ref("2026-08"),
  bloqueosParaLista: ref([]),
  bloqueosPorFecha: computed(() => new Map()),
  diasBloqueados: ref([]),
  guardandoBloqueo: ref(false),
  impactoBloqueo: ref<ImpactoBloqueoDto | null>(null),
  cargandoImpactoBloqueo: ref(false),
  errorImpactoBloqueo: ref(""),
  consultarImpactoBloqueo: vi.fn().mockResolvedValue(true),
  limpiarImpactoBloqueo: vi.fn(),
  crearBloqueo: vi.fn().mockResolvedValue(true),
  eliminarBloqueo: vi.fn().mockResolvedValue(true),
  cargarTodo: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createEmergencyState = (items: BloqueoEmergenciaListItemDto[] = []) => ({
  emergencias: ref(items),
  cargandoLista: ref(false),
  creando: ref(false),
  cargarEmergencias: vi.fn().mockResolvedValue(true),
  crearEmergencia: vi.fn().mockResolvedValue({ id: 99 }),
});

const mountAgenda = () =>
  mount(AgendaView, {
    global: {
      stubs: {
        DisponibilidadCalendar: CalendarStub,
        Dialog: DialogStub,
        DialogContent: SlotStub,
        DialogDescription: SlotStub,
        DialogFooter: SlotStub,
        DialogHeader: SlotStub,
        DialogTitle: SlotStub,
        Select: SlotStub,
        SelectContent: SlotStub,
        SelectItem: SlotStub,
        SelectTrigger: SlotStub,
        SelectValue: SlotStub,
        Button: ButtonStub,
        Input: InputStub,
        Label: LabelStub,
        Textarea: TextareaStub,
        RouterLink: RouterLinkStub,
        ChevronDown: ChevronDownStub,
      },
    },
  });

const crearEmergencia = (
  overrides: Partial<BloqueoEmergenciaListItemDto> = {},
): BloqueoEmergenciaListItemDto => ({
  id: 1,
  desde: "2026-08-20",
  hasta: "2026-08-21",
  motivo: "Corte programado",
  activo: true,
  creado_en: "2026-08-17T09:00:00Z",
  retirado_en: null,
  total_afectados: 12,
  pendientes_contacto: 4,
  pendientes_resolucion: 7,
  ...overrides,
});

describe("AgendaView — emergencias y bloqueos", () => {
  let agendaState: ReturnType<typeof createAgendaState>;
  let emergencyState: ReturnType<typeof createEmergencyState>;

  beforeEach(() => {
    agendaState = createAgendaState();
    emergencyState = createEmergencyState();
    useAgendaMock.mockReturnValue(agendaState);
    useEmergenciasMock.mockReturnValue(emergencyState);
  });

  it("envía el payload válido, limpia el formulario y recarga la agenda", async () => {
    const wrapper = mountAgenda();

    await wrapper.get("#emergencia-desde").setValue("2026-08-20");
    await wrapper.get("#emergencia-hasta").setValue("2026-08-21");
    await wrapper.get("#emergencia-motivo").setValue("  Corte de luz  ");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(emergencyState.crearEmergencia).toHaveBeenCalledWith({
      desde: "2026-08-20",
      hasta: "2026-08-21",
      motivo: "Corte de luz",
    });
    expect((wrapper.get("#emergencia-desde").element as HTMLInputElement).value).toBe("");
    expect((wrapper.get("#emergencia-hasta").element as HTMLInputElement).value).toBe("");
    expect((wrapper.get("#emergencia-motivo").element as HTMLTextAreaElement).value).toBe("");
    expect(agendaState.cargarTodo).toHaveBeenCalledTimes(2);
    expect(emergencyState.cargarEmergencias).toHaveBeenCalledOnce();
  });

  it("rechaza un rango invertido sin llamar a crear emergencia", async () => {
    const wrapper = mountAgenda();

    await wrapper.get("#emergencia-desde").setValue("2026-08-22");
    await wrapper.get("#emergencia-hasta").setValue("2026-08-21");
    await wrapper.get("form").trigger("submit");

    expect(emergencyState.crearEmergencia).not.toHaveBeenCalled();
    expect(wrapper.get('[role="alert"]').text()).toContain("no puede ser posterior");
    expect(agendaState.cargarTodo).toHaveBeenCalledOnce();
  });

  it("ordena activas primero, permite filtrar por estado y mantiene las filas colapsadas", async () => {
    emergencyState = createEmergencyState([
      crearEmergencia({ id: 2, desde: "2026-08-22", hasta: "2026-08-23" }),
      crearEmergencia({ id: 3, desde: "2026-08-20", hasta: "2026-08-20" }),
      crearEmergencia({
        id: 4,
        desde: "2026-08-18",
        hasta: "2026-08-19",
        activo: false,
        motivo: null,
        retirado_en: "2026-08-24T09:00:00Z",
      }),
    ]);
    useEmergenciasMock.mockReturnValue(emergencyState);

    const wrapper = mountAgenda();
    const toggles = () => wrapper.findAll("button[aria-expanded]");

    expect(toggles().map((button) => button.attributes("aria-controls"))).toEqual([
      "emergencia-detalle-3",
      "emergencia-detalle-2",
      "emergencia-detalle-4",
    ]);
    expect(toggles()[0].attributes("aria-expanded")).toBe("false");
    expect(wrapper.find("#emergencia-detalle-3").exists()).toBe(false);

    await toggles()[0].trigger("click");
    expect(wrapper.find("#emergencia-detalle-3").text()).toContain("Total afectados");
    expect(toggles()[0].attributes("aria-expanded")).toBe("true");

    await toggles()[0].trigger("click");
    expect(wrapper.find("#emergencia-detalle-3").exists()).toBe(false);

    await wrapper.get("#emergencias-filtro").setValue("RETIRADAS");
    expect(toggles()).toHaveLength(1);
    expect(toggles()[0].attributes("aria-controls")).toBe("emergencia-detalle-4");
  });

  it("muestra los bloqueos manuales antes de los días de emergencia", () => {
    const manualTemprano = {
      id: 1,
      fecha: "2026-08-18",
      tipo: "PERSONAL",
      motivo: "Asunto personal",
      creado_en: "2026-08-16T12:00:00.000Z",
      origen: "MANUAL",
      emergencia_id: null,
      eliminable_individualmente: true,
    } as const;
    const manualTarde = { ...manualTemprano, id: 2, fecha: "2026-08-22" };
    const emergencia = {
      ...manualTemprano,
      id: 3,
      fecha: "2026-08-17",
      tipo: "EMERGENCIA",
      motivo: "Cierre urgente",
      origen: "EMERGENCIA",
      emergencia_id: 9,
      eliminable_individualmente: false,
    } as const;
    agendaState = createAgendaState({
      bloqueosParaLista: ref([manualTemprano, manualTarde, emergencia]),
    });
    useAgendaMock.mockReturnValue(agendaState);

    const wrapper = mountAgenda();
    const lista = wrapper
      .findAll("ul")
      .find((element) => element.text().includes("Bloqueo manual"));
    if (!lista) throw new Error("No se encontró la lista de bloqueos");

    const filas = lista.findAll("li");
    expect(filas).toHaveLength(3);
    expect(filas[0].text()).toContain(formatDiaISO(manualTemprano.fecha));
    expect(filas[1].text()).toContain(formatDiaISO(manualTarde.fecha));
    expect(filas[2].text()).toContain("Emergencia");
    expect(filas[2].find("button").exists()).toBe(false);
  });

  it("muestra la advertencia solo cuando el bloqueo afecta clientes", async () => {
    const impacto = ref<ImpactoBloqueoDto>({
      fecha: "2026-08-20",
      total_pedidos_afectados: 3,
      clientes_unicos_afectados: 2,
    });
    agendaState = createAgendaState({ impactoBloqueo: impacto });
    useAgendaMock.mockReturnValue(agendaState);

    const wrapper = mountAgenda();
    await wrapper.get('[data-test="calendar-day"]').trigger("click");
    await flushPromises();

    expect(agendaState.consultarImpactoBloqueo).toHaveBeenCalledWith("2026-08-20");
    expect(wrapper.text()).toContain("Este bloqueo afectaría a 2 clientes");

    impacto.value = {
      fecha: "2026-08-20",
      total_pedidos_afectados: 0,
      clientes_unicos_afectados: 0,
    };
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain("Este bloqueo afectaría");
  });

  it("expone un error de consulta sin afirmar que no hay afectaciones", async () => {
    agendaState = createAgendaState({ errorImpactoBloqueo: ref("Servicio no disponible") });
    useAgendaMock.mockReturnValue(agendaState);

    const wrapper = mountAgenda();
    await wrapper.get('[data-test="calendar-day"]').trigger("click");

    expect(wrapper.get('[role="alert"]').text()).toContain("Servicio no disponible");
    expect(wrapper.text()).not.toContain("No hay clientes afectados");
  });
});
