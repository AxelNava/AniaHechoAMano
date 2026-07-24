// Espejo manual de `CotizarPedidoDto` del backend
// (`src/pedidos/dto/cotizar-pedido.dto.ts`). Cuerpo de
// `POST /api/pedidos/:id/cotizar` (admin). Solo aplica a pedidos en `COTIZANDO`
// (solicitudes con modificación): fija precio/tiempo por línea, fija y re-valida
// la fecha acordada, y avanza el estado.

/** Cotización de una línea: precio fijado por el admin y, opcionalmente, tiempo ajustado. */
export interface CotizarLineaDto {
  producto_pedido_id: number;
  precio_fijado_admin: number;
  // Si se omite, se conserva el tiempo congelado de la línea.
  tiempo_total_estimado_minutos?: number;
}

export interface CotizarPedidoDto {
  // Fecha de entrega acordada (ISO "YYYY-MM-DD"). Se re-valida con disponibilidad.
  fecha_entrega_acordada: string;
  lineas: CotizarLineaDto[];
}
