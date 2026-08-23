import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { computed, reactive, ref } from "vue";
import type { BloqueoEmergenciaListItemDto } from "@/types/disponibilidad/emergenciaDto";

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

const createAgendaState = () => ({
  config: ref(null),
  form: reactive({ capacidad_minutos_dia: 480, dias_anticipacion_min: 2 }),
  cargandoConfig: ref(false),
  guardandoConfig: ref(false),
  guardarConfig: vi.fn().mockResolvedValue(undefined),
  mesVisible: ref("2026-08"),
  bloqueos: ref([]),
  bloqueosPorFecha: computed(() => new Map()),
  diasBloqueados: ref([]),
  guardandoBloqueo: ref(false),
  crearBloqueo: vi.fn().mockResolvedValue(true),
  eliminarBloqueo: vi.fn().mockResolvedValue(true),
  cargarTodo: vi.fn().mockResolvedValue(undefined),
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
        DisponibilidadCalendar: SlotStub,
        Dialog: SlotStub,
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
      },
    },
  });

describe("AgendaView — emergencias", () => {
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
    expect(wrapper.get('[role="alert"]').text()).toContain(
      "no puede ser posterior",
    );
    expect(agendaState.cargarTodo).toHaveBeenCalledOnce();
  });

  it("muestra rango, motivo, estado y contadores de las emergencias", () => {
    emergencyState = createEmergencyState([
      {
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
      },
      {
        id: 2,
        desde: "2026-08-22",
        hasta: "2026-08-23",
        motivo: null,
        activo: false,
        creado_en: "2026-08-17T09:00:00Z",
        retirado_en: "2026-08-24T09:00:00Z",
        total_afectados: 3,
        pendientes_contacto: 0,
        pendientes_resolucion: 1,
      },
    ]);
    useEmergenciasMock.mockReturnValue(emergencyState);

    const texto = mountAgenda().text();

    expect(texto).toContain("Activa");
    expect(texto).toContain("Retirada");
    expect(texto).toContain("Corte programado");
    expect(texto).toContain("Total afectados");
    expect(texto).toContain("Pendientes de contacto");
    expect(texto).toContain("Pendientes de resolución");
    expect(texto).toContain("12");
    expect(texto).toContain("4");
    expect(texto).toContain("7");
  });
});
