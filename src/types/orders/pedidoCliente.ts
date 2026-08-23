import type { OrigenProductoPedido } from "@/types/orders/createOrderDto";
import type { TipoRedSocial } from "@/types/orders/createPedidoPublicoDto";

// ────────────────────────────────────────────────────────────────────────────
// VIEW-MODELS DEL FLUJO PÚBLICO DE PEDIDO (solo frontend).
//
// Estos tipos NO son espejo de ningún DTO del backend: modelan el "carrito" del
// cliente en el navegador (store `pedidoClienteStore` + composable
// `usePedidoCliente`). Solo la porción serializable se persiste a localStorage;
// las fotos `File[]` viven aparte, en memoria. El payload real hacia el backend
// se construye con `CreatePedidoPublicoDto` (ese sí es el contrato).
// ────────────────────────────────────────────────────────────────────────────

/**
 * Snapshot de datos del producto capturado al agregar la línea (desde
 * `ProductoInfoPedidoDto`). Sirve para el resumen y para sumar los minutos que
 * alimentan la disponibilidad, sin necesidad de volver a consultar el backend.
 */
export interface PedidoClienteLineaInfo {
  nombre: string;
  precio_base: number;
  tiempo_total_estimado_minutos: number;
  categoria_id: number | null;
  categoria: string;
  permite_modificaciones: boolean;
  requiere_anticipo: boolean;
}

/** Línea del carrito del cliente. `uid` es local (para mapear fotos y v-for). */
export interface PedidoClienteLinea {
  uid: string;
  producto_id: number;
  origen: OrigenProductoPedido;
  es_modificacion: boolean;
  descripcion_cliente: string;
  info: PedidoClienteLineaInfo;
}

/** Datos de contacto capturados en el paso Contacto del wizard. */
export interface ContactoClienteInput {
  nombre: string;
  telefono: string;
  tipo_red_social: TipoRedSocial | "";
  url_perfil: string;
}

/**
 * Snapshot serializable de un pedido ya enviado, para que la pantalla de
 * confirmación muestre el resumen aunque el carrito activo ya se haya vaciado
 * (sobrevive incluso a un reload porque se persiste).
 */
export interface ResumenLineaEnviada {
  nombre: string;
  es_modificacion: boolean;
  precio_base: number;
}

export interface ResumenPedidoEnviado {
  referencia_publica: string;
  /** Token público opcional para snapshots creados antes del seguimiento. */
  seguimiento_token_publico?: string | null;
  hay_modificaciones: boolean;
  requiere_anticipo: boolean;
  contacto_nombre: string;
  tipo_red_social: TipoRedSocial | "";
  url_perfil: string;
  fecha_solicitada: string | null;
  lineas: ResumenLineaEnviada[];
  fotos_pendientes: boolean;
}
