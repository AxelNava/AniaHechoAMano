import { computed, ref, watch } from "vue";
import { toast } from "vue-sonner";
import { OrdersApi } from "@/services/orders/ordersApi";
import { useDisponibilidad } from "@/composables/pedido/useDisponibilidad";
import type { CotizarLineaDto } from "@/types/orders/cotizarPedidoDto";
import type { PedidoDetalleDto } from "@/types/orders/orderHistoryDto";
import type { DiaISO } from "@/components/ui/calendar";

type DialogoAdmin = "confirmar" | "cotizar" | null;

/**
 * Línea editable en el diálogo de cotización. `precio`/`tiempo` se enlazan a un
 * `<Input v-model.number>`: éste entrega `number`, o `""` (string) cuando el
 * campo se vacía — de ahí el tipo `number | string` (nunca `null`, que el Input
 * no acepta). El valor inicial nulo del backend se normaliza a `""`.
 */
interface LineaCotizarEditable {
  producto_pedido_id: number;
  descripcion: string;
  precio: number | string;
  tiempo: number | string;
}

/** Normaliza una fecha del backend (ISO date o timestamp) a `YYYY-MM-DD`. */
const aDiaISO = (fecha: string | null): DiaISO | null => (fecha ? fecha.slice(0, 10) : null);

/**
 * Acciones ADMIN sobre un pedido (confirmar / cotizar), con su estado de
 * diálogo, formularios y el calendario de disponibilidad asociado.
 *
 * - `pedido` es un getter reactivo al detalle actual de la vista.
 * - `onExito` recibe el detalle actualizado que devuelve el backend, para que la
 *   vista refresque sin un segundo round-trip.
 *
 * Se apoya en `toast` para el feedback (el estado success/error de
 * `useLoadingButton` es poco fiable por su bug conocido).
 */
export function usePedidoAdminAcciones(
  pedido: () => PedidoDetalleDto | null,
  onExito: (detalle: PedidoDetalleDto) => void,
) {
  const ordersApi = new OrdersApi();

  const dialogo = ref<DialogoAdmin>(null);
  const guardando = ref(false);

  // Fecha elegida en el calendario: opcional al confirmar, obligatoria al cotizar.
  const fechaElegida = ref<DiaISO | null>(null);
  const lineasCotizar = ref<LineaCotizarEditable[]>([]);

  // Minutos que alimentan la disponibilidad del calendario: al cotizar usa los
  // tiempos que el admin edita; al confirmar, los tiempos congelados del pedido.
  const minutosEstimados = computed<number>(() => {
    const p = pedido();
    if (!p) return 0;
    if (dialogo.value === "cotizar") {
      return lineasCotizar.value.reduce((suma, l) => suma + (Number(l.tiempo) || 0), 0);
    }
    return p.productos.reduce((suma, l) => suma + (l.tiempo_total_estimado_minutos ?? 0), 0);
  });

  const disponibilidad = useDisponibilidad(minutosEstimados);

  const puedeConfirmar = computed(() => pedido()?.estado === "PENDIENTE_CONFIRMACION");
  const puedeCotizar = computed(() => pedido()?.estado === "COTIZANDO");

  const abrirConfirmar = () => {
    const p = pedido();
    if (!p) return;
    // Preselecciona la fecha solicitada por el cliente (si la hay) como sugerida.
    fechaElegida.value = aDiaISO(p.fecha_entrega_solicitada);
    dialogo.value = "confirmar";
  };

  const abrirCotizar = () => {
    const p = pedido();
    if (!p) return;
    lineasCotizar.value = p.productos.map((linea) => ({
      producto_pedido_id: linea.id,
      descripcion: linea.descripcion_cliente,
      precio: linea.precio_fijado_admin ?? "",
      tiempo: linea.tiempo_total_estimado_minutos ?? "",
    }));
    fechaElegida.value = null;
    dialogo.value = "cotizar";
  };

  const cerrar = () => {
    dialogo.value = null;
  };

  const confirmar = async () => {
    const p = pedido();
    if (!p) return;
    guardando.value = true;
    try {
      const detalle = await ordersApi.confirmarPedido(
        p.id,
        fechaElegida.value ? { fecha_entrega_acordada: fechaElegida.value } : {},
      );
      toast.success("Pedido confirmado.");
      onExito(detalle);
      cerrar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo confirmar el pedido.");
    } finally {
      guardando.value = false;
    }
  };

  const cotizar = async () => {
    const p = pedido();
    if (!p) return;

    if (!fechaElegida.value) {
      toast.error("Elige una fecha de entrega disponible.");
      return;
    }
    // El v-model del Input puede entregar string/"": validamos coercionando.
    const precioInvalido = lineasCotizar.value.some((l) => {
      const n = Number(l.precio);
      return String(l.precio).trim() === "" || !Number.isFinite(n) || n < 0;
    });
    if (precioInvalido) {
      toast.error("Fija un precio válido (≥ 0) para cada línea.");
      return;
    }

    const lineas: CotizarLineaDto[] = lineasCotizar.value.map((l) => {
      const tiempoNum = Number(l.tiempo);
      const incluyeTiempo = String(l.tiempo).trim() !== "" && Number.isFinite(tiempoNum);
      return {
        producto_pedido_id: l.producto_pedido_id,
        precio_fijado_admin: Number(l.precio),
        ...(incluyeTiempo ? { tiempo_total_estimado_minutos: tiempoNum } : {}),
      };
    });

    guardando.value = true;
    try {
      const detalle = await ordersApi.cotizarPedido(p.id, {
        fecha_entrega_acordada: fechaElegida.value,
        lineas,
      });
      toast.success("Pedido cotizado.");
      onExito(detalle);
      cerrar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cotizar el pedido.");
    } finally {
      guardando.value = false;
    }
  };

  // Reevalúa la fecha elegida (motivos/sugerencias) mientras haya un diálogo abierto.
  watch(fechaElegida, (fecha) => {
    if (dialogo.value) void disponibilidad.evaluarFecha(fecha);
  });

  return {
    dialogo,
    guardando,
    fechaElegida,
    lineasCotizar,
    minutosEstimados,
    disponibilidad,
    puedeConfirmar,
    puedeCotizar,
    abrirConfirmar,
    abrirCotizar,
    cerrar,
    confirmar,
    cotizar,
  };
}
