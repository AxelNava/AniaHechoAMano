import { ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { disponibilidadApi } from "@/services/disponibilidad/disponibilidadApi";
import type { DisponibilidadResponseDto } from "@/types/disponibilidad/disponibilidadDto";
import type { DiaISO, MesISO } from "@/components/ui/calendar";

const pad2 = (n: number) => String(n).padStart(2, "0");

const hoyISO = (): DiaISO => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${pad2(hoy.getMonth() + 1)}-${pad2(hoy.getDate())}`;
};

const mesActualISO = (): MesISO => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${pad2(hoy.getMonth() + 1)}`;
};

const primerDiaDelMes = (mes: MesISO): DiaISO => `${mes}-01`;

const ultimoDiaDelMes = (mes: MesISO): DiaISO => {
  const [anio, mesNum] = mes.split("-").map(Number);
  const ultimo = new Date(anio, mesNum, 0).getDate();
  return `${mes}-${pad2(ultimo)}`;
};

/**
 * Orquesta la disponibilidad para el `DisponibilidadCalendar` (controlado, §8.1).
 *
 * - Carga los días del mes visible (`GET /api/disponibilidad/dias`) con caché por
 *   mes+minutos y acumula el resultado en las listas blanca/negra que consume el
 *   calendario.
 * - `evaluarFecha` consulta un día puntual (`POST /api/disponibilidad/evaluar`)
 *   con debounce, para mostrar motivos/sugerencias.
 *
 * `minutos` es reactivo: al cambiar (p.ej. se agrega otra línea al carrito) se
 * limpia la caché y se recarga, porque la capacidad del día depende de ellos.
 */
export function useDisponibilidad(minutos: MaybeRefOrGetter<number> = 0) {
  const mesVisible = ref<MesISO>(mesActualISO());
  const minFecha = ref<DiaISO>(hoyISO());
  const diasDisponibles = ref<DiaISO[]>([]);
  const diasDeshabilitados = ref<DiaISO[]>([]);
  const cargandoMes = ref(false);

  const evaluacion = ref<DisponibilidadResponseDto | null>(null);
  const evaluando = ref(false);

  // Acumuladores entre meses ya cargados (la lista blanca del calendario es la
  // unión de días disponibles de todos los meses consultados).
  const disponiblesSet = new Set<DiaISO>();
  const deshabilitadosSet = new Set<DiaISO>();
  const cacheMeses = new Map<string, boolean>();

  const claveCache = (mes: MesISO) => `${mes}|${toValue(minutos)}`;

  const volcarSets = () => {
    diasDisponibles.value = [...disponiblesSet];
    diasDeshabilitados.value = [...deshabilitadosSet];
  };

  const cargarMes = async (mes: MesISO) => {
    if (cacheMeses.has(claveCache(mes))) return;

    const desdeBase = primerDiaDelMes(mes);
    const desde = desdeBase < hoyISO() ? hoyISO() : desdeBase;
    const hasta = ultimoDiaDelMes(mes);

    // Mes completamente en el pasado: nada seleccionable, no consultamos.
    if (desde > hasta) {
      cacheMeses.set(claveCache(mes), true);
      return;
    }

    cargandoMes.value = true;
    try {
      const respuesta = await disponibilidadApi.getDias(desde, hasta, toValue(minutos));
      if (!respuesta) return;

      cacheMeses.set(claveCache(mes), true);
      minFecha.value = respuesta.min_fecha;

      respuesta.dias.forEach((dia) => {
        if (dia.disponible) {
          disponiblesSet.add(dia.fecha);
          deshabilitadosSet.delete(dia.fecha);
        } else {
          deshabilitadosSet.add(dia.fecha);
          disponiblesSet.delete(dia.fecha);
        }
      });

      volcarSets();
    } finally {
      cargandoMes.value = false;
    }
  };

  const reiniciarPorMinutos = () => {
    disponiblesSet.clear();
    deshabilitadosSet.clear();
    cacheMeses.clear();
    diasDisponibles.value = [];
    diasDeshabilitados.value = [];
    void cargarMes(mesVisible.value);
  };

  const recargar = async (): Promise<void> => {
    disponiblesSet.clear();
    deshabilitadosSet.clear();
    cacheMeses.clear();
    diasDisponibles.value = [];
    diasDeshabilitados.value = [];
    evaluacion.value = null;
    await cargarMes(mesVisible.value);
  };

  const evaluarFecha = useDebounceFn(async (fecha: DiaISO | null) => {
    if (!fecha) {
      evaluacion.value = null;
      return;
    }
    evaluando.value = true;
    try {
      evaluacion.value = await disponibilidadApi.evaluar(fecha, toValue(minutos));
    } finally {
      evaluando.value = false;
    }
  }, 300);

  watch(mesVisible, (mes) => void cargarMes(mes), { immediate: true });
  watch(() => toValue(minutos), reiniciarPorMinutos);

  return {
    mesVisible,
    minFecha,
    diasDisponibles,
    diasDeshabilitados,
    cargandoMes,
    evaluacion,
    evaluando,
    evaluarFecha,
    recargar,
  };
}
