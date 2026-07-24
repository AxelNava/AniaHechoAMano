import { computed, ref, watch } from "vue";
import type { StepperPaso } from "@/components/ui/stepper";
import { usePedidoCliente } from "@/composables/pedido/usePedidoCliente";
import { useDireccionEntrega } from "@/composables/pedido/useDireccionEntrega";

export type PasoId = "contacto" | "direccion" | "fecha" | "resumen" | "confirmar";

export interface PasoWizard extends StepperPaso {
  id: PasoId;
}

/**
 * Máquina de pasos del wizard de pedido. Presentacional-agnóstica: mantiene el
 * índice (1-based, alineado con `Stepper`), la lista de pasos (dinámica) y la
 * validación por paso con el patrón `validationError` + early-returns.
 *
 * Regla clave (§8.7): si ≥1 línea es modificación, se ocultan los pasos Fecha y
 * Resumen de precio (el pedido irá a COTIZANDO, sin fecha ni precio firmes).
 *
 * La navegación (siguiente/anterior/irAPaso) la lleva ESTE composable; el
 * `Stepper` solo pinta. El envío final se dispara desde la vista.
 */
export function usePedidoWizard() {
  const cliente = usePedidoCliente();
  const direccion = useDireccionEntrega();

  const pasoActual = ref(1);
  const validationError = ref("");

  const pasos = computed<PasoWizard[]>(() => {
    const base: PasoWizard[] = [
      { id: "contacto", titulo: "Contacto", descripcion: "Cómo ubicarte" },
      { id: "direccion", titulo: "Dirección", descripcion: "Dónde entregar" },
    ];

    if (!cliente.hayModificaciones.value) {
      base.push({ id: "fecha", titulo: "Fecha", descripcion: "Cuándo la quieres" });
      base.push({ id: "resumen", titulo: "Resumen", descripcion: "Revisa el total" });
    }

    base.push({ id: "confirmar", titulo: "Confirmar", descripcion: "Enviar solicitud" });
    return base;
  });

  const stepperPasos = computed<StepperPaso[]>(() =>
    pasos.value.map(({ titulo, descripcion }) => ({ titulo, descripcion })),
  );

  const pasoActualId = computed<PasoId | undefined>(() => pasos.value[pasoActual.value - 1]?.id);
  const esPrimerPaso = computed(() => pasoActual.value <= 1);
  const esUltimoPaso = computed(() => pasoActual.value >= pasos.value.length);

  // Si la lista de pasos se acorta (p.ej. se agrega una modificación estando en
  // Fecha/Resumen), reencuadra el índice para no quedar fuera de rango.
  watch(
    () => pasos.value.length,
    (largo) => {
      if (pasoActual.value > largo) pasoActual.value = largo;
    },
  );

  const validarPasoActual = (): boolean => {
    validationError.value = "";

    switch (pasoActualId.value) {
      case "contacto": {
        const { nombre, telefono, url_perfil } = cliente.contacto.value;
        if (!nombre.trim()) {
          validationError.value = "Necesitamos tu nombre para el pedido.";
          return false;
        }
        if (!telefono.trim() && !url_perfil.trim()) {
          validationError.value =
            "Déjanos al menos un medio de contacto: un teléfono o tu perfil/usuario de red social.";
          return false;
        }
        return true;
      }

      case "direccion": {
        const resultado = direccion.validarContinuar();
        if (!resultado.ok) {
          validationError.value = resultado.aviso ?? "";
          return false;
        }
        return true;
      }

      case "fecha": {
        if (!cliente.fechaSolicitada.value) {
          validationError.value = "Elige una fecha disponible en el calendario.";
          return false;
        }
        return true;
      }

      // "resumen" y "confirmar" no bloquean el avance.
      default:
        return true;
    }
  };

  const siguiente = (): boolean => {
    if (!validarPasoActual()) return false;
    if (pasoActual.value < pasos.value.length) pasoActual.value += 1;
    return true;
  };

  const anterior = () => {
    validationError.value = "";
    if (pasoActual.value > 1) pasoActual.value -= 1;
  };

  /** Salto directo permitido solo a pasos ya completados (emitido por `Stepper`). */
  const irAPaso = (numero: number) => {
    if (numero >= 1 && numero < pasoActual.value) {
      validationError.value = "";
      pasoActual.value = numero;
    }
  };

  return {
    pasoActual,
    pasos,
    stepperPasos,
    pasoActualId,
    esPrimerPaso,
    esUltimoPaso,
    validationError,
    siguiente,
    anterior,
    irAPaso,
    validarPasoActual,
  };
}
