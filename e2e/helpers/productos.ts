import { type APIRequestContext, type Locator, type Page, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { API_BASE, MARCA_E2E } from "./real";

// ────────────────────────────────────────────────────────────────────────────
// Helpers de INTEGRACIÓN REAL para crear/editar productos CON imágenes desde el
// panel admin (front + backend :3001 + Neon). Comparten convención con
// `helpers/real.ts`: nada de mocks, todo lo creado se marca con `[E2E]`.
//
// ── Regla de anotación (la que se valida) ───────────────────────────────────
//   Cada vez que un test AGREGA una foto, además escribe en la descripción del
//   producto la línea `Foto agregada: <archivo>`. Cuando REEMPLAZA/cambia una
//   foto existente, NO anota nada. Así validamos de forma determinista que la
//   foto se incorporó (comprobando la descripción persistida), sin depender del
//   binario de la imagen.
// ────────────────────────────────────────────────────────────────────────────

/** Carpeta donde el usuario pega sus fotos de prueba. Ver su README. */
const DIR_FOTOS = fileURLToPath(new URL("../fixtures/productos", import.meta.url));

const EXTENSIONES_IMAGEN = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

/** Nombre de archivo (sin ruta) de una foto. */
export const nombreArchivo = (ruta: string): string => basename(ruta);

/**
 * Línea que se anota en la descripción cuando se AGREGA una foto. La `marca`
 * opcional (p. ej. el runId) la hace única por corrida para poder afirmar que
 * ESTA corrida la agregó (y no una anterior, en productos reutilizados).
 */
export const notaFotoAgregada = (ruta: string, marca?: string | number): string =>
  `Foto agregada: ${nombreArchivo(ruta)}${marca !== undefined ? ` (${marca})` : ""}`;

/**
 * Lee las fotos pegadas en `e2e/fixtures/productos/` (ordenadas por nombre) y
 * devuelve sus rutas absolutas. Ignora el README y cualquier no-imagen. Si hay
 * menos de `minimo`, lanza un error explicando dónde pegar fotos.
 */
export function fotosDePrueba(minimo = 1): string[] {
  const rutas = readdirSync(DIR_FOTOS)
    .filter((archivo) => EXTENSIONES_IMAGEN.some((ext) => archivo.toLowerCase().endsWith(ext)))
    .sort((a, b) => a.localeCompare(b))
    .map((archivo) => `${DIR_FOTOS}/${archivo}`);

  if (rutas.length < minimo) {
    throw new Error(
      `Se necesitan al menos ${minimo} foto(s) de prueba, pero hay ${rutas.length} en ` +
        `${DIR_FOTOS}. Pega imágenes (.png/.jpg/.jpeg/.webp/.gif) en esa carpeta.`,
    );
  }
  return rutas;
}

// ── Localizadores del gestor de imágenes (ProductImagesManager) ──────────────
// El gestor vive dentro de un <aside> tanto en Crear como en Editar producto.

/** Input oculto de AGREGAR (multiple). Acepta varias fotos de una vez. */
const inputAgregar = (page: Page): Locator =>
  page.locator('aside input[type="file"][multiple]');

/** Tarjetas de imagen actualmente en el gestor. */
const tarjetasImagen = (page: Page): Locator => page.locator("aside article");

/** Input "Cambiar imagen" de la tarjeta i-ésima (single, no multiple). */
const inputCambiar = (page: Page, index: number): Locator =>
  tarjetasImagen(page).nth(index).locator('input[type="file"]:not([multiple])');

/** Cantidad de fotos actualmente en el gestor. */
export const contarFotos = (page: Page): Promise<number> => tarjetasImagen(page).count();

/**
 * AGREGA una foto al gestor y ANOTA la línea `Foto agregada: <archivo>` al final
 * de la descripción. Verifica que aparezca una tarjeta nueva. Devuelve la nota.
 */
export async function agregarFotoYAnotar(
  page: Page,
  descripcion: Locator,
  ruta: string,
  marca?: string | number,
): Promise<string> {
  const antes = await contarFotos(page);
  await inputAgregar(page).setInputFiles(ruta);
  await expect(tarjetasImagen(page)).toHaveCount(antes + 1);

  const nota = notaFotoAgregada(ruta, marca);
  const actual = (await descripcion.inputValue()).trimEnd();
  await descripcion.fill(actual ? `${actual}\n${nota}` : nota);
  return nota;
}

/**
 * REEMPLAZA la foto de la tarjeta i-ésima por otra. NO toca la descripción
 * (por diseño: los cambios no se anotan). La cantidad de fotos no varía.
 */
export async function cambiarFotoSinAnotar(
  page: Page,
  index: number,
  ruta: string,
): Promise<void> {
  const antes = await contarFotos(page);
  await inputCambiar(page, index).setInputFiles(ruta);
  await expect(tarjetasImagen(page)).toHaveCount(antes);
  // La etiqueta de la tarjeta pasa a mostrar el nombre del archivo nuevo.
  await expect(tarjetasImagen(page).nth(index)).toContainText(nombreArchivo(ruta));
}

// ── API real: lectura de detalle y resolución de categoría ───────────────────

export interface RecetaItemApi {
  componente_id: number;
  cantidad: number;
}

export interface ProductoDetalleApi {
  id: number;
  nombre: string;
  descripcion?: string;
  imagenes?: { id?: number; url: string; orden: number }[];
  componentes?: RecetaItemApi[];
}

/** GET /api/productos/:id — detalle con descripción e imágenes reales. */
export async function obtenerProductoDetalle(
  request: APIRequestContext,
  id: number,
): Promise<ProductoDetalleApi> {
  const res = await request.get(`${API_BASE}/api/productos/${id}`);
  expect(res.ok(), `GET /api/productos/${id} falló (${res.status()})`).toBeTruthy();
  return (await res.json()) as ProductoDetalleApi;
}

/** Resuelve el id de una categoría por nombre (GET /api/categories). */
export async function idCategoria(request: APIRequestContext, nombre: string): Promise<number> {
  const res = await request.get(`${API_BASE}/api/categories`);
  expect(res.ok(), `GET /api/categories falló (${res.status()})`).toBeTruthy();
  const categorias = (await res.json()) as { id: number; nombre: string }[];
  const cat = categorias.find((c) => c.nombre.trim().toLowerCase() === nombre.toLowerCase());
  if (!cat) throw new Error(`No existe la categoría ${nombre} en el backend.`);
  return cat.id;
}

/**
 * Busca por API el producto `[E2E]` recién creado por su nombre exacto (el
 * formulario de crear se resetea sin navegar, así que se localiza por API).
 */
export async function buscarProductoPorNombre(
  request: APIRequestContext,
  nombre: string,
): Promise<ProductoDetalleApi> {
  const consultas = [
    `${API_BASE}/api/productos?search=${encodeURIComponent(nombre)}&limit=100&page=1`,
    // Fallback por si el backend ignora `search`: barre la lista reciente.
    `${API_BASE}/api/productos?limit=100&page=1&sort=id:desc`,
  ];

  for (const url of consultas) {
    const res = await request.get(url);
    if (!res.ok()) continue;
    const body = (await res.json()) as { data?: { id: number; nombre: string }[] };
    const encontrado = (body.data ?? []).find((p) => p.nombre === nombre);
    if (encontrado) return obtenerProductoDetalle(request, encontrado.id);
  }

  throw new Error(`No se encontró por API el producto recién creado "${nombre}".`);
}

// ── API real: componentes y recetas (gestor "Componentes del producto") ─────

export interface ComponenteApi {
  id: number;
  tipo: string;
  nombre: string;
  descripcion?: string | null;
  unidad_medida: string;
  requiere_pedido_previo: boolean;
  activo: boolean;
}

/** GET /api/productos/componentes — lista plana de componentes reales. */
export async function listarComponentes(request: APIRequestContext): Promise<ComponenteApi[]> {
  const res = await request.get(`${API_BASE}/api/productos/componentes`);
  expect(res.ok(), `GET /api/productos/componentes falló (${res.status()})`).toBeTruthy();
  return (await res.json()) as ComponenteApi[];
}

/** Lee un componente real por id (no hay GET /:id, se filtra la lista). */
export async function obtenerComponente(
  request: APIRequestContext,
  id: number,
): Promise<ComponenteApi> {
  const componente = (await listarComponentes(request)).find((c) => c.id === id);
  if (!componente) throw new Error(`El componente ${id} no existe en el backend.`);
  return componente;
}

/**
 * Garantiza que exista un componente `[E2E]` con ese nombre EXACTO y lo
 * devuelve. Es IDEMPOTENTE: si ya existe (de una corrida anterior) lo reutiliza
 * — el backend NO tiene DELETE de componentes, así que nunca se recrea. Al
 * crear se envía `forzarCreacion: true` para esquivar el 409 de duplicados.
 */
export async function asegurarComponente(
  request: APIRequestContext,
  nombre: string,
  datos: Partial<Omit<ComponenteApi, "id" | "nombre">> = {},
): Promise<ComponenteApi> {
  const existente = (await listarComponentes(request)).find((c) => c.nombre === nombre);
  if (existente) return existente;

  const res = await request.post(`${API_BASE}/api/productos/componentes/new`, {
    data: {
      tipo: "MATERIAL",
      nombre,
      descripcion: "Componente de prueba automatizada E2E. Ignorar.",
      unidad_medida: "pieza",
      requiere_pedido_previo: false,
      activo: true,
      forzarCreacion: true,
      ...datos,
    },
  });
  expect(res.ok(), `No se pudo crear el componente "${nombre}" (${res.status()})`).toBeTruthy();
  return (await res.json()) as ComponenteApi;
}

/**
 * Crea un producto `[E2E]` con la receta inicial dada (POST /api/productos/new,
 * multipart con `componentes` = JSON de [{componente_id, cantidad}]). NO es
 * idempotente: el nombre debe traer un runId único por corrida/escenario.
 */
export async function crearProductoConReceta(
  request: APIRequestContext,
  nombre: string,
  receta: RecetaItemApi[],
  categoria: string,
): Promise<ProductoDetalleApi> {
  const categoriaId = await idCategoria(request, categoria);
  const res = await request.post(`${API_BASE}/api/productos/new`, {
    multipart: {
      nombre,
      descripcion: "Producto de prueba E2E para el gestor de componentes. Ignorar.",
      precio_base: "100",
      categoria_id: String(categoriaId),
      activo: "true",
      componentes: JSON.stringify(receta),
    },
  });
  expect(res.ok(), `No se pudo crear el producto "${nombre}" (${res.status()})`).toBeTruthy();
  const { id } = (await res.json()) as { id: number };
  return obtenerProductoDetalle(request, id);
}

/** Prefijo de nombre estándar para productos creados por estas pruebas. */
export const nombreProductoE2E = (runId: number): string =>
  `${MARCA_E2E} Producto con fotos ${runId}`;

/** Nombre fijo del producto editable reutilizable (con foto semilla). */
const NOMBRE_PRODUCTO_EDITABLE = `${MARCA_E2E} Producto editable con foto`;

/**
 * Garantiza un producto `[E2E]` EDITABLE que YA trae al menos una imagen (para
 * poder ejercitar "cambiar una foto existente"). Es IDEMPOTENTE: si ya existe
 * de una corrida anterior lo reutiliza (solo se crea la primera vez, con una
 * foto semilla). Se puede forzar por id con `E2E_PRODUCTO_EDIT_ID`.
 */
export async function asegurarProductoEditableConFoto(
  request: APIRequestContext,
  categoria: string,
): Promise<ProductoDetalleApi> {
  const idForzado = process.env.E2E_PRODUCTO_EDIT_ID;
  if (idForzado) {
    return obtenerProductoDetalle(request, Number(idForzado));
  }

  const res = await request.get(
    `${API_BASE}/api/productos?search=${encodeURIComponent(NOMBRE_PRODUCTO_EDITABLE)}&limit=100&page=1`,
  );
  expect(res.ok(), `GET /api/productos?search falló (${res.status()})`).toBeTruthy();
  const body = (await res.json()) as { data?: { id: number; nombre: string }[] };
  const existente = (body.data ?? []).find((p) => p.nombre === NOMBRE_PRODUCTO_EDITABLE);
  if (existente) {
    const detalle = await obtenerProductoDetalle(request, existente.id);
    if ((detalle.imagenes?.length ?? 0) > 0) return detalle;
    // Existe pero perdió sus imágenes: cae al alta para re-sembrar la foto.
  }

  const categoriaId = await idCategoria(request, categoria);
  const creado = await request.post(`${API_BASE}/api/productos/new`, {
    multipart: {
      nombre: NOMBRE_PRODUCTO_EDITABLE,
      descripcion: "Producto de prueba E2E para editar imágenes. Ignorar.",
      precio_base: "120",
      categoria_id: String(categoriaId),
      activo: "true",
      permite_modificaciones: "true",
      requiere_anticipo: "false",
      componentes: JSON.stringify([]),
      imagenes: {
        name: nombreArchivo(fotosDePrueba(1)[0]),
        mimeType: "image/png",
        buffer: readFileSync(fotosDePrueba(1)[0]),
      },
      imagenes_orden: "0",
    },
  });
  expect(
    creado.ok(),
    `No se pudo crear el producto editable con foto [E2E] (${creado.status()})`,
  ).toBeTruthy();
  const { id } = (await creado.json()) as { id: number };
  return obtenerProductoDetalle(request, id);
}
