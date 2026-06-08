import { ComponentsDto } from "@/types/products/ComponentsDto";

export interface ProductImageDto {
  id?: number;
  url: string;
  public_id?: string | null;
  proveedor?: string | null;
  alt?: string;
  orden: number;
  es_portada?: boolean;
}

export interface ProductImageItem {
  id: string;
  file?: File;
  previewUrl: string;
  existingUrl?: string;
  alt?: string;
  orden: number;
  isPrimary: boolean;
}

export interface ProductDto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio_base: number;
  categoria_id: number;
  activo?: boolean;
  componentes: ComponentsDto[];
  imagenes?: ProductImageDto[];
}
