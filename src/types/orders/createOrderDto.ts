export interface ClienteListItemDto {
  id: number;
  nombre: string;
  telefono: string | null;
  red_social_contacto: string | null;
}

export interface ClienteNuevoInput {
  nombre: string;
  telefono?: string;
  red_social_contacto?: string;
  notas?: string;
}

export interface ComponenteActualDto {
  componente_id: number;
  nombre: string;
  unidad_medida: string;
  cantidad: number;
  costo_unitario_actual: number | null;
  minutos_unitarios_actuales: number;
}

export interface ProductoInfoPedidoDto {
  id: number;
  nombre: string;
  descripcion: string;
  precio_base: number;
  categoria_id: number | null;
  categoria: string;
  tiempo_total_estimado_minutos: number;
  componentes: ComponenteActualDto[];
}

export interface CreateOrderComponenteInput {
  componente_id: number;
  nombre: string;
  unidad_medida: string;
  cantidad: number;
  costo_unitario_congelado: number;
  minutos_unitarios_congelados: number;
}

export type OrigenProductoPedido = "catalogo" | "personalizado";

export interface CreateOrderProductoInput {
  uid: string;
  origen: OrigenProductoPedido;
  producto_id?: number;
  nombre: string;
  categoria_id?: number;
  descripcion_cliente: string;
  precio_fijado_admin: number | null;
  tiempo_total_estimado_minutos: number | null;
  foto_referencia_url?: string;
  componentes: CreateOrderComponenteInput[];
}

export interface CreateOrderComponentePayload {
  componente_id: number;
  cantidad: number;
  costo_unitario_congelado: number;
  minutos_unitarios_congelados: number;
}

export interface CreateOrderProductoPayload {
  producto_id?: number;
  categoria_id?: number;
  descripcion_cliente: string;
  precio_fijado_admin?: number;
  tiempo_total_estimado_minutos?: number;
  foto_referencia_url?: string;
  componentes?: CreateOrderComponentePayload[];
}

export interface CreateOrderDto {
  nombre?: string;
  cliente_id?: number;
  cliente_nuevo?: ClienteNuevoInput;
  fecha_entrega_acordada: string;
  estado?: string;
  anticipo_pagado?: number;
  notas_admin?: string;
  precio_final_total?: number;
  productos: CreateOrderProductoPayload[];
}
