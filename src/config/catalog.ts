/**
 * Configuración del catálogo público.
 *
 * Cada entrada mapea un "slug" de ruta (ej. /categoria/papeleria-creativa) a un
 * título visible y a la lista de NOMBRES de categoría que deben consultarse.
 *
 * Se mapea por nombre (no por id) para que sea robusto ante cambios de id en la
 * base de datos: la vista obtiene /api/categories y resuelve estos nombres a sus
 * ids antes de consultar los productos. La coincidencia es sin distinción de
 * mayúsculas/acentos no se normalizan, así que escribe los nombres tal como
 * existen en la base de datos.
 *
 * Para agregar/editar una sección del menú basta con tocar este archivo (y el
 * arreglo `services` de LandingNavbar.vue si cambia el menú superior).
 */
export interface CatalogCategoryConfig {
  /** Slug usado en la URL: /categoria/:slug */
  slug: string;
  /** Título mostrado en la cabecera de la página. */
  titulo: string;
  /** Texto descriptivo opcional bajo el título. */
  descripcion?: string;
  /** Nombres de categoría a consultar (una o varias). */
  categorias: string[];
}

export const catalogConfig: Record<string, CatalogCategoryConfig> = {
  "adornos-de-fiesta": {
    slug: "adornos-de-fiesta",
    titulo: "Adornos de fiesta",
    descripcion: "Detalles y decoraciones hechas a mano para que cada celebración sea inolvidable.",
    categorias: ["Adornos"],
  },
  "papeleria-creativa": {
    slug: "papeleria-creativa",
    titulo: "Papelería creativa",
    descripcion: "Tarjetas, invitaciones y cajas personalizadas con un toque único y artesanal.",
    categorias: ["Tarjetas", "Invitaciones", "Cajas", "Piñatas"],
  },
  postres: {
    slug: "postres",
    titulo: "Postres",
    descripcion: "Postres artesanales preparados con dedicación y los mejores ingredientes.",
    categorias: ["Postres"],
  },
  sublimacion: {
    slug: "sublimacion",
    titulo: "Sublimación",
    descripcion: "Productos sublimados y personalizados para regalar o regalarte.",
    categorias: ["Sublimación"],
  },
};

export const getCatalogConfig = (slug: string): CatalogCategoryConfig | undefined =>
  catalogConfig[slug];
