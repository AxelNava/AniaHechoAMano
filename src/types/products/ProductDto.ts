import { ComponentsDto } from "@/types/products/ComponentsDto";

export interface ProductDto {
  nombre: string;
  descripcion?: string;
  precio_base: number;
  categoria_id: number;
  activo?: boolean;
  componentes: ComponentsDto[];
}
