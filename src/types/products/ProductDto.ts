import { ComponentsDto } from "@/types/products/ComponentsDto";

export interface ProductImageDto {
  id?: number;
  url: string;
  // Endpoint binario servido por la API (`/productos/:id/imagenes/:imgId/binario`).
  // Lo devuelve `GET /api/productos/:id`; es la fuente fiable para mostrar la
  // imagen (el `url` apunta al almacenamiento local temporal `/uploads/...`).
  binario_url?: string;
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
  // Espejo de `productos.permite_modificaciones`/`requiere_anticipo` del backend
  // (opt-in del admin: modificaciones por el cliente y anticipo obligatorio).
  permite_modificaciones: boolean;
  requiere_anticipo: boolean;
  componentes: ComponentsDto[];
  imagenes?: ProductImageDto[];
}
