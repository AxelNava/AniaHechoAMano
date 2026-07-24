import type { OrigenProductoPedido } from "@/types/orders/createOrderDto";
import type { CreatePedidoEntregaInput } from "@/types/orders/entregaDto";

// Espejo manual de `CreatePedidoPublicoDto` del backend
// (`src/pedidos/dto/create-pedido-publico.dto.ts`). Contrato MÍNIMO de creación
// de pedido del cliente final (`POST /api/pedidos/solicitud`): no admite
// `estado`, `precio_*`, `notas_admin` ni costos/tiempos congelados (todo eso lo
// decide el servidor). Debe indicarse exactamente uno de `cliente_id` o
// `cliente_nuevo` (validado en el service).

/** Red social del cliente (espejo del enum Prisma `TipoRedSocial`). */
export type TipoRedSocial = "FACEBOOK" | "INSTAGRAM" | "WHATSAPP" | "OTRO";

/** Datos de contacto de un cliente NUEVO en el flujo público. */
export interface ClientePublicoNuevoInput {
  nombre: string;
  telefono?: string;
  red_social_contacto?: string;
  tipo_red_social?: TipoRedSocial;
  url_perfil?: string;
}

/**
 * Línea de producto del pedido público. El costo/tiempo NO se envían: el
 * servidor congela la receta server-side por `producto_id`.
 */
export interface CreatePedidoPublicoProductoInput {
  producto_id: number;
  origen: OrigenProductoPedido;
  es_modificacion?: boolean;
  descripcion_cliente?: string;
}

export interface CreatePedidoPublicoDto {
  cliente_id?: number;
  cliente_nuevo?: ClientePublicoNuevoInput;
  entrega?: CreatePedidoEntregaInput;
  fecha_entrega_solicitada?: string;
  maps_url_omitida?: boolean;
  productos: CreatePedidoPublicoProductoInput[];
}
