export interface CatalogProductImageDto {
  id: number;
  url: string;
  imagen: string;
  binario_url: string;
  nombre: string;
  ruta: string;
  public_id?: string | null;
  proveedor?: string | null;
  alt?: string | null;
  orden: number;
  es_portada: boolean;
}

export interface CatalogProductDto {
  id: number;
  nombre: string;
  descripcion: string;
  precio_base: number;
  activo: boolean;
  fecha_creacion: string;
  tiene_historial: boolean;
  categoria_id: number | null;
  categoria: string;
  tags_por_producto: string[];
  imagenes?: CatalogProductImageDto[];
}
