import type { OrigenProductoPedido } from "@/types/orders/createOrderDto";
import type { TipoRedSocial } from "@/types/orders/createPedidoPublicoDto";
import type { ProductoOpcionesPedidoPublicoDto } from "@/types/products/ProductoOpcionesPedidoPublicoDto";

// ────────────────────────────────────────────────────────────────────────────
// VIEW-MODELS DEL FLUJO PÚBLICO DE PEDIDO (solo frontend).
//
// Estos tipos NO son espejo de ningún DTO del backend: modelan el "carrito" del
// cliente en el navegador (store `pedidoClienteStore` + composable
// `usePedidoCliente`). El borrador serializable se limita a sessionStorage;
// fotos y resumen de confirmación viven aparte, en memoria. El payload al backend
// se construye con `CreatePedidoPublicoDto` (ese sí es el contrato).
// ────────────────────────────────────────────────────────────────────────────

/** Snapshot persistible limitado a las opciones públicas seguras del producto. */
export type PedidoClienteLineaInfo = Omit<ProductoOpcionesPedidoPublicoDto, "id">;

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

/** Línea del resumen de confirmación, conservado solo en memoria. */
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
