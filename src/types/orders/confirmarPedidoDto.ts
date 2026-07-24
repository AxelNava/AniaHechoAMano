// Espejo manual de `ConfirmarPedidoDto` del backend
// (`src/pedidos/dto/confirmar-pedido.dto.ts`). Cuerpo de
// `POST /api/pedidos/:id/confirmar` (admin). Solo aplica a pedidos en
// `PENDIENTE_CONFIRMACION`.
//
// `fecha_entrega_acordada` es una fecha AJUSTADA opcional (ISO "YYYY-MM-DD"): si
// se omite, se re-valida y fija la `fecha_entrega_solicitada` del pedido; si se
// envía, se re-valida y fija esa (permite al admin correr la fecha si la
// original se llenó entre la solicitud y la confirmación).
export interface ConfirmarPedidoDto {
  fecha_entrega_acordada?: string;
}
