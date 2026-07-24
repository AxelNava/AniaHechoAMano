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
  // Espejo de `ComponenteDto.forzarCreacion` del backend: fuerza la creación
  // aunque exista un componente con datos similares (p. ej. copias por producto).
  forzarCreacion?: boolean;
}

// Espejo de `UpdateComponenteDto` del backend (PartialType + OmitType de
// `forzarCreacion`): actualización parcial de un componente global.
export type UpdateComponenteDto = Partial<
  Pick<
    ComponenteDto,
    "tipo" | "nombre" | "descripcion" | "unidad_medida" | "requiere_pedido_previo" | "activo"
  >
>;
