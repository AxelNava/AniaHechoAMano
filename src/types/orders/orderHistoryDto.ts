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
  categoria_ids?: number[];
  activo?: boolean;
  sort?: string;
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

/** Imagen de una línea de pedido (fotos de modificación subidas por el cliente). */
export interface PedidoProductoImagenDto {
  id: number;
  url: string;
  alt: string | null;
  orden: number;
}

/** Dirección de entrega del pedido (1:1). */
export interface PedidoEntregaDto {
  id: number;
  calle: string | null;
  numero_casa: string | null;
  referencia: string | null;
  municipio: string | null;
  maps_url: string | null;
  notas: string | null;
}

export interface PedidoProductoDto {
  id: number;
  descripcion_cliente: string;
  es_modificacion: boolean;
  precio_estimado_ia: number | null;
  precio_fijado_admin: number | null;
  tiempo_total_estimado_minutos: number | null;
  foto_referencia_url: string | null;
  imagenes: PedidoProductoImagenDto[];
  componentes: PedidoProductoComponenteSnapshotDto[];
}

export interface PedidoHistorialListItemDto {
  id: number;
  cliente_id: number;
  nombre: string | null;
  referencia_publica: string | null;
  fecha_solicitud: string;
  fecha_entrega_solicitada: string | null;
  // Nullable: los pedidos COTIZANDO/PENDIENTE_CONFIRMACION aún no tienen fecha
  // firme (se fija al confirmar/cotizar).
  fecha_entrega_acordada: string | null;
  estado: string;
  retrasado: boolean;
  precio_final_total: number | null;
  anticipo_pagado: number;
  notas_admin: string | null;
  maps_url_omitida: boolean;
  entrega: PedidoEntregaDto | null;
  cliente?: { nombre: string };
  cliente_nombre?: string;
  producto_id: number | null;
  categoria: string | null;
  imagen_referencia_url: string | null;
  imagen_producto_id: number | null;
  productos: PedidoProductoDto[];
}

export type PedidoDetalleDto = PedidoHistorialListItemDto;
