import { shallowRef, toValue, type MaybeRefOrGetter } from "vue";
import { ProductApi } from "@/services/products/productApi";
import type { PedidoClienteLinea } from "@/types/orders/pedidoCliente";
const mensajeError =
  "No pudimos obtener un tiempo válido para revisar la disponibilidad. Inténtalo de nuevo.";
const esIdValido = (id: unknown): id is number =>
  typeof id === "number" && Number.isSafeInteger(id) && id > 0;
export function usePedidoMinutosPedido(lineas: MaybeRefOrGetter<readonly PedidoClienteLinea[]>) {
  const productApi = new ProductApi();
  const minutosTotales = shallowRef<number | null>(null);
  const cargando = shallowRef(false);
  const error = shallowRef("");
  let solicitud = 0;
  const hidratar = async (): Promise<void> => {
    const solicitudActual = ++solicitud;
    cargando.value = true;
    error.value = "";
    minutosTotales.value = null;
    try {
      const lineasActuales = toValue(lineas);
      const cantidades = new Map<number, number>();
      for (const linea of lineasActuales) {
        if (!esIdValido(linea.producto_id)) throw new Error(mensajeError);
        cantidades.set(linea.producto_id, (cantidades.get(linea.producto_id) ?? 0) + 1);
      }
      if (cantidades.size === 0) throw new Error(mensajeError);
      const minutosPorProducto = await Promise.all(
        [...cantidades.keys()].map(async (id) => {
          const respuesta = await productApi.getProductOrderOptions(id);
          const minutos = respuesta?.tiempo_total_estimado_minutos;
          if (
            !respuesta ||
            respuesta.id !== id ||
            typeof minutos !== "number" ||
            !Number.isFinite(minutos) ||
            minutos < 0
          ) {
            throw new Error(mensajeError);
          }
          return minutos * (cantidades.get(id) ?? 0);
        }),
      );
      const total = minutosPorProducto.reduce((suma, minutos) => suma + minutos, 0);
      if (!Number.isFinite(total) || total <= 0) throw new Error(mensajeError);
      if (solicitudActual === solicitud) minutosTotales.value = total;
    } catch {
      if (solicitudActual === solicitud) error.value = mensajeError;
    } finally {
      if (solicitudActual === solicitud) cargando.value = false;
    }
  };
  const limpiar = () => {
    solicitud += 1;
    minutosTotales.value = null;
    cargando.value = false;
    error.value = "";
  };
  return { minutosTotales, cargando, error, hidratar, reintentar: hidratar, limpiar };
}
