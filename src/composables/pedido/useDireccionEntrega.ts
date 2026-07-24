import { storeToRefs } from "pinia";
import { usePedidoClienteStore } from "@/stores/pedidoClienteStore";

export interface ResultadoGateMaps {
  /** true si se puede continuar al siguiente paso. */
  ok: boolean;
  /** Mensaje de aviso a mostrar (solo en la 1ª omisión). */
  aviso?: string;
}

const AVISO_SIN_MAPS =
  "Sin el enlace de Google Maps nos costará más ubicar la entrega. " +
  "Si no lo tienes a mano, vuelve a presionar Continuar para omitirlo.";

/**
 * Soft-gate del enlace de Maps en el paso de dirección.
 *
 * - 1ª vez que se intenta continuar sin `maps_url` → devuelve `ok: false` con un
 *   aviso (no bloquea de verdad, solo insiste).
 * - 2ª vez → devuelve `ok: true` y marca `maps_url_omitida = true` (el backend lo
 *   registra para que el admin sepa que fue omitido a propósito).
 * - Si el cliente escribe un `maps_url`, se limpia el estado del gate.
 *
 * El contador de intentos vive en el store (serializable) para sobrevivir la
 * navegación SPA dentro del wizard.
 */
export function useDireccionEntrega() {
  const store = usePedidoClienteStore();
  const { entrega, mapsUrlOmitida, intentosOmitirMaps } = storeToRefs(store);

  const validarContinuar = (): ResultadoGateMaps => {
    const maps = entrega.value.maps_url?.trim();

    if (maps) {
      // Tiene enlace: gate satisfecho, se limpia cualquier omisión previa.
      mapsUrlOmitida.value = false;
      intentosOmitirMaps.value = 0;
      return { ok: true };
    }

    if (intentosOmitirMaps.value === 0) {
      intentosOmitirMaps.value = 1;
      return { ok: false, aviso: AVISO_SIN_MAPS };
    }

    mapsUrlOmitida.value = true;
    return { ok: true };
  };

  return {
    entrega,
    mapsUrlOmitida,
    intentosOmitirMaps,
    validarContinuar,
  };
}
