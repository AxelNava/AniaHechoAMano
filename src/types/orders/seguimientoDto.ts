import type { EstadoPedido } from "@/types/disponibilidad/emergenciaDto";

export type { EstadoPedido };

export interface PedidoSeguimientoDto {
  referencia_publica: string | null;
  estado: EstadoPedido | null;
  retrasado: boolean;
  fecha_entrega_solicitada: string | null;
  fecha_entrega_acordada: string | null;
}
