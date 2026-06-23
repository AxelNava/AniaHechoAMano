export interface PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMetaDto;
}

export interface ProductListQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  categoria_id?: number;
  activo?: boolean;
}

export interface PedidoHistorialQueryDto {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  estado?: string;
  sort?: string;
}

export interface PedidoProductoComponenteSnapshotDto {
  id: number;
  nombre: string;
  cantidad: number;
  unidad_medida: string;
  costo_unitario_congelado: number | null;
}

export interface PedidoProductoDto {
  id: number;
  descripcion_cliente: string;
  precio_estimado_ia: number | null;
  precio_fijado_admin: number | null;
  tiempo_total_estimado_minutos: number | null;
  foto_referencia_url: string | null;
  componentes: PedidoProductoComponenteSnapshotDto[];
}

export interface PedidoHistorialListItemDto {
  id: number;
  cliente_id: number;
  nombre: string | null;
  fecha_solicitud: string;
  fecha_entrega_acordada: string;
  estado: string;
  precio_final_total: number | null;
  anticipo_pagado: number;
  notas_admin: string | null;
  cliente?: { nombre: string };
  cliente_nombre?: string;
  producto_id: number | null;
  categoria: string | null;
  imagen_referencia_url: string | null;
  imagen_producto_id: number | null;
  productos: PedidoProductoDto[];
}

export type PedidoDetalleDto = PedidoHistorialListItemDto;
