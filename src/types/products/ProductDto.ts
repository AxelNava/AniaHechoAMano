import { ComponentsDto } from "@/types/products/ComponentsDto";

export interface ProductDto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio_base: number;
  categoria_id: number;
  activo?: boolean;
  componentes: ComponentsDto[];
}
