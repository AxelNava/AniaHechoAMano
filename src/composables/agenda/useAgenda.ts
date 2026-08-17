import { computed, reactive, ref } from "vue";
import { toast } from "vue-sonner";
import { disponibilidadApi } from "@/services/disponibilidad/disponibilidadApi";
import type {
  AgendaConfigDto,
  BloqueoDto,
  CreateBloqueoDto,
  TipoBloqueoAgenda,
} from "@/types/disponibilidad/agendaDto";
import type { DiaISO, MesISO } from "@/components/ui/calendar";

type BloqueoManualDto = BloqueoDto & {
  tipo: TipoBloqueoAgenda;
  origen: "MANUAL";
  emergencia_id: null;
  eliminable_individualmente: true;
};

const esBloqueoManualEliminable = (bloqueo: BloqueoDto): bloqueo is BloqueoManualDto =>
  bloqueo.origen === "MANUAL" && bloqueo.eliminable_individualmente;

const pad2 = (n: number) => String(n).padStart(2, "0");

const mesActualISO = (): MesISO => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${pad2(hoy.getMonth() + 1)}`;
};

/**
 * Estado y side-effects de la vista de agenda del admin: el singleton
 * `agenda_config` (capacidad/anticipación) y el CRUD de `agenda_bloqueo`.
 *
 * Se apoya en `toast` para el feedback (el bug conocido de `useLoadingButton`
 * hace poco fiable su estado success/error). Mantiene la vista como superficie
 * de composición: toda la orquestación vive aquí.
 */
export function useAgenda() {
  // --- Configuración ---
  const config = ref<AgendaConfigDto | null>(null);
  const cargandoConfig = ref(false);
  const guardandoConfig = ref(false);

  // Modelo editable, independiente del singleton cargado.
  const form = reactive<{ capacidad_minutos_dia: number; dias_anticipacion_min: number }>({
    capacidad_minutos_dia: 480,
    dias_anticipacion_min: 2,
  });

  const cargarConfig = async () => {
    cargandoConfig.value = true;
    try {
      const data = await disponibilidadApi.getConfig();
      if (data) {
        config.value = data;
        form.capacidad_minutos_dia = data.capacidad_minutos_dia;
        form.dias_anticipacion_min = data.dias_anticipacion_min;
      }
    } finally {
      cargandoConfig.value = false;
    }
  };

  const guardarConfig = async () => {
    // El v-model del Input puede entregar string; coercionamos antes de validar/enviar
    // (el backend valida `@IsInt`, un string rompería la validación).
    const capacidad = Number(form.capacidad_minutos_dia);
    const anticipacion = Number(form.dias_anticipacion_min);

    if (!Number.isInteger(capacidad) || capacidad < 1) {
      toast.error("La capacidad diaria debe ser un entero de al menos 1 minuto.");
      return;
    }
    if (!Number.isInteger(anticipacion) || anticipacion < 0) {
      toast.error("Los días de anticipación deben ser un entero no negativo.");
      return;
    }

    guardandoConfig.value = true;
    try {
      config.value = await disponibilidadApi.updateConfig({
        capacidad_minutos_dia: capacidad,
        dias_anticipacion_min: anticipacion,
      });
      toast.success("Configuración de agenda guardada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la configuración.");
    } finally {
      guardandoConfig.value = false;
    }
  };

  // --- Bloqueos ---
  // Se cargan todos (son pocos: feriados/días personales) para poder pintarlos
  // en cualquier mes del calendario sin recargar al navegar.
  const todosLosBloqueos = ref<BloqueoDto[]>([]);
  const cargandoBloqueos = ref(false);
  const mesVisible = ref<MesISO>(mesActualISO());

  const bloqueos = computed(() => todosLosBloqueos.value.filter(esBloqueoManualEliminable));
  const bloqueosPorFecha = computed(
    () => new Map(bloqueos.value.map((b) => [b.fecha, b] as const)),
  );
  const diasBloqueados = computed<DiaISO[]>(() => todosLosBloqueos.value.map((b) => b.fecha));

  const cargarBloqueos = async () => {
    cargandoBloqueos.value = true;
    try {
      todosLosBloqueos.value = await disponibilidadApi.getBloqueos();
    } finally {
      cargandoBloqueos.value = false;
    }
  };

  const guardandoBloqueo = ref(false);

  const crearBloqueo = async (dto: CreateBloqueoDto): Promise<boolean> => {
    guardandoBloqueo.value = true;
    try {
      await disponibilidadApi.createBloqueo(dto);
      await cargarBloqueos();
      toast.success("Día bloqueado.");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo bloquear el día.");
      return false;
    } finally {
      guardandoBloqueo.value = false;
    }
  };

  const eliminarBloqueo = async (bloqueo: BloqueoDto): Promise<boolean> => {
    if (bloqueo.origen !== "MANUAL" || !bloqueo.eliminable_individualmente) return false;

    guardandoBloqueo.value = true;
    try {
      await disponibilidadApi.deleteBloqueo(bloqueo.id);
      await cargarBloqueos();
      toast.success("Bloqueo eliminado.");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar el bloqueo.");
      return false;
    } finally {
      guardandoBloqueo.value = false;
    }
  };

  const cargarTodo = async () => {
    await Promise.all([cargarConfig(), cargarBloqueos()]);
  };

  return {
    // config
    config,
    form,
    cargandoConfig,
    guardandoConfig,
    guardarConfig,
    // bloqueos
    bloqueos,
    cargandoBloqueos,
    mesVisible,
    bloqueosPorFecha,
    diasBloqueados,
    guardandoBloqueo,
    crearBloqueo,
    eliminarBloqueo,
    // carga inicial
    cargarTodo,
  };
}

/** Etiquetas en español para los tipos de bloqueo (para selects y badges). */
export const TIPO_BLOQUEO_LABELS: Record<TipoBloqueoAgenda, string> = {
  FERIADO: "Feriado",
  PERSONAL: "Personal",
  OCUPADO: "Ocupado",
};
