export interface ProductoOpcionesPedidoPublicoDto {
  id: number;
  nombre: string;
  precio_base: number;
  /** El endpoint público lo devuelve; se valida antes de usarlo para disponibilidad. */
  tiempo_total_estimado_minutos?: number;
  permite_modificaciones: boolean;
  requiere_anticipo: boolean;
}
