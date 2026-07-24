// Espejo manual de `CreatePedidoEntregaDto` del backend
// (`src/pedidos/dto/pedido-entrega.dto.ts`). Dirección de entrega 1:1 del pedido.
// Todos los campos son opcionales para permitir el soft-gate de Maps del wizard
// (el cliente puede omitir el enlace de Maps). `maps_url` es texto libre acotado,
// no se valida como URL estricta en el backend.
export interface CreatePedidoEntregaInput {
  calle?: string;
  numero_casa?: string;
  referencia?: string;
  municipio?: string;
  maps_url?: string;
  notas?: string;
}
