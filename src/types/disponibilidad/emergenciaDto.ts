import type { TipoRedSocial } from "@/types/orders/createPedidoPublicoDto";

export type EstadoPedido =
  | "COTIZANDO"
  | "PENDIENTE_CONFIRMACION"
  | "ESPERANDO_ANTICIPO"
  | "CONFIRMADO"
  | "EN_PROCESO"
  | "TERMINADO"
  | "ENTREGADO"
  | "CANCELADO";

export type ResolucionAfectado = "RETRASADO" | "CANCELADO" | "OBSOLETO";

export interface CreateBloqueoEmergenciaDto {
  desde: string;
  hasta: string;
  motivo?: string;
}

export interface MarcarContactadoDto {
  contactado: boolean;
}

export type ResolverAfectadoDto =
  | { resolucion: "CANCELADO" }
  | { resolucion: "RETRASADO"; nueva_fecha: string };

export interface BloqueoEmergenciaListItemDto {
  id: number;
  desde: string;
  hasta: string;
  motivo: string | null;
  activo: boolean;
  creado_en: string;
  retirado_en: string | null;
  total_afectados: number;
  pendientes_contacto: number;
  pendientes_resolucion: number;
}

export interface ClienteAfectadoDto {
  id: number;
  nombre: string;
  telefono: string | null;
  tipo_red_social: TipoRedSocial | null;
  url_perfil: string | null;
  red_social_contacto: string | null;
}

export interface PedidoAfectadoDto {
  id: number;
  pedido_id: number;
  referencia_publica: string | null;
  estado_pedido: EstadoPedido | null;
  fecha_entrega_original: string;
  contactado: boolean;
  contactado_en: string | null;
  resolucion: ResolucionAfectado | null;
  resuelto_en: string | null;
  nueva_fecha: string | null;
  tiempo_total_minutos: number;
  cliente: ClienteAfectadoDto;
}

export interface BloqueoEmergenciaDetalleDto extends BloqueoEmergenciaListItemDto {
  dias_bloqueados: string[];
  dias_con_bloqueo_manual: string[];
  afectados: PedidoAfectadoDto[];
}
