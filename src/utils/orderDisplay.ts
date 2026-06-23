import {
  getProductImageBinaryUrl,
  resolveProductImageUrl,
} from "@/services/products/productApi";
import type { PedidoHistorialListItemDto } from "@/types/orders/orderHistoryDto";

/** Helpers de presentación compartidos por las vistas/tablas de pedidos. */

export const ESTADO_LABELS: Record<string, string> = {
  COTIZANDO: "Cotizando",
  ESPERANDO_ANTICIPO: "Esperando anticipo",
  CONFIRMADO: "Confirmado",
  EN_PROCESO: "En proceso",
  TERMINADO: "Terminado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const getEstadoLabel = (estado: string): string => ESTADO_LABELS[estado] ?? estado;

// Los estados conservan colores semánticos (no de la paleta) porque comunican
// el avance del pedido de un vistazo.
const ESTADO_COLORS: Record<string, string> = {
  COTIZANDO: "bg-yellow-100 text-yellow-800 ring-yellow-600/20",
  ESPERANDO_ANTICIPO: "bg-orange-100 text-orange-800 ring-orange-600/20",
  CONFIRMADO: "bg-blue-100 text-blue-800 ring-blue-600/20",
  EN_PROCESO: "bg-purple-100 text-purple-800 ring-purple-600/20",
  TERMINADO: "bg-green-100 text-green-800 ring-green-600/20",
  ENTREGADO: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  CANCELADO: "bg-red-100 text-red-800 ring-red-600/20",
};

export const getEstadoColor = (estado: string): string =>
  ESTADO_COLORS[estado] ?? "bg-gray-100 text-gray-800 ring-gray-600/20";

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    Number(amount),
  );
};

export const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const formatDateLong = (date: string): string =>
  new Date(date).toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export const getClienteNombre = (pedido: PedidoHistorialListItemDto): string =>
  pedido.cliente?.nombre || pedido.cliente_nombre || `Cliente #${pedido.cliente_id}`;

/** Días entre hoy y la fecha de entrega (negativo si ya pasó). */
export const getDiasParaEntrega = (fecha: string): number => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const entrega = new Date(fecha);
  entrega.setHours(0, 0, 0, 0);
  return Math.round((entrega.getTime() - hoy.getTime()) / 86_400_000);
};

export const getEntregaTexto = (fecha: string): string => {
  const dias = getDiasParaEntrega(fecha);
  if (dias === 0) return "Es hoy";
  if (dias === 1) return "Es mañana";
  if (dias > 1) return `Faltan ${dias} días`;
  if (dias === -1) return "Fue ayer";
  return `Hace ${Math.abs(dias)} días`;
};

/**
 * Imagen representativa del pedido: la foto propia del pedido si existe; si no,
 * la portada del producto servida por el endpoint binario (igual que en el
 * resto de la app, donde el campo `url` no es directamente cargable).
 */
export const getPedidoImagenUrl = (pedido: PedidoHistorialListItemDto): string => {
  if (pedido.imagen_referencia_url) {
    return resolveProductImageUrl(pedido.imagen_referencia_url);
  }
  if (pedido.imagen_producto_id !== null) {
    return getProductImageBinaryUrl(pedido.imagen_producto_id);
  }
  return "";
};

/** True cuando la imagen mostrada es la portada del producto, no una foto del pedido. */
export const getPedidoEsTemplate = (pedido: PedidoHistorialListItemDto): boolean =>
  !pedido.imagen_referencia_url && pedido.imagen_producto_id !== null;

/** Clave de mes "YYYY-MM" para agrupar. */
export const getMonthKey = (fecha: string): string => {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Etiqueta de mes capitalizada, p. ej. "Junio 2026". */
export const getMonthLabel = (fecha: string): string => {
  const label = new Date(fecha).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};
