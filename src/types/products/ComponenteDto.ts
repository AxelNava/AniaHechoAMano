export interface ComponenteDto {
  id: number;
  tipo: string;
  nombre: string;
  descripcion?: string;
  unidad_medida: string;
  requiere_pedido_previo: boolean;
  activo?: boolean;
}

export interface CreateComponenteDto {
  tipo: string;
  nombre: string;
  descripcion?: string;
  unidad_medida: string;
  requiere_pedido_previo: boolean;
  activo?: boolean;
}
