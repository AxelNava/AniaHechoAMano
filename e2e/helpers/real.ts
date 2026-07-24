import { type APIRequestContext, type Page, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

// ────────────────────────────────────────────────────────────────────────────
// Helpers de INTEGRACIÓN REAL (front + backend :3001 + Neon).
//
// A diferencia de `helpers/mocks.ts` (que intercepta la red con `page.route`),
// aquí NO se mockea nada: se descubren datos reales por API y se leen respuestas
// reales del backend. Todo lo que se crea se marca con el prefijo `[E2E]`.
// ────────────────────────────────────────────────────────────────────────────

/** URL base del backend NestJS. El front la lee de VITE_VUE_APP_DOMAIN. */
export const API_BASE = process.env.E2E_API_URL ?? "http://localhost:3001";

/** Slug del catálogo público cuya config incluye la categoría "Piñatas". */
export const SLUG_PINATAS = process.env.E2E_SLUG ?? "papeleria-creativa";

/** Nombre de la categoría (del backend) que sí mapea a un slug del catálogo. */
export const CATEGORIA_PINATAS = "Piñatas";

/** Prefijo con el que se marcan TODOS los datos creados por estas pruebas. */
export const MARCA_E2E = "[E2E]";

/** Ruta absoluta a la imagen fixture usada en la subida de fotos (fase 2). */
export const IMAGEN_FIXTURE = fileURLToPath(
  new URL("../fixtures/e2e-sample.png", import.meta.url),
);

const pad2 = (n: number) => String(n).padStart(2, "0");

export interface ProductoApi {
  id: number;
  nombre: string;
  activo: boolean;
  permite_modificaciones: boolean;
  requiere_anticipo: boolean;
  categoria_id: number;
  categoria: string;
}

interface CategoriaApi {
  id: number;
  nombre: string;
}

interface DiaDisponibilidad {
  fecha: string;
  disponible: boolean;
  motivos: string[];
}

/** Lista productos activos del catálogo real (GET /api/productos). */
export async function listarProductos(request: APIRequestContext): Promise<ProductoApi[]> {
  const res = await request.get(`${API_BASE}/api/productos?activo=true&limit=100&page=1`);
  expect(res.ok(), `GET /api/productos falló (${res.status()})`).toBeTruthy();
  const body = (await res.json()) as { data?: ProductoApi[] } | ProductoApi[];
  return Array.isArray(body) ? body : (body.data ?? []);
}

/**
 * Descubre un producto real "tal cual": activo, en la categoría "Piñatas" (la
 * única que mapea a un slug del catálogo) y que NO permite modificaciones. Se
 * puede forzar por id con `E2E_PRODUCTO_ID`.
 */
export async function descubrirProductoTalCual(request: APIRequestContext): Promise<ProductoApi> {
  const productos = await listarProductos(request);

  const idForzado = process.env.E2E_PRODUCTO_ID;
  if (idForzado) {
    const encontrado = productos.find((p) => p.id === Number(idForzado));
    if (encontrado) return encontrado;
  }

  const candidato = productos.find(
    (p) => p.activo && p.categoria === CATEGORIA_PINATAS && !p.permite_modificaciones,
  );
  if (!candidato) {
    throw new Error(
      `No hay un producto 'tal cual' (activo, categoría ${CATEGORIA_PINATAS}, ` +
        "permite_modificaciones=false) para la prueba real.",
    );
  }
  return candidato;
}

/** Resuelve el id de la categoría "Piñatas" en el backend real. */
async function idCategoriaPinatas(request: APIRequestContext): Promise<number> {
  const res = await request.get(`${API_BASE}/api/categories`);
  expect(res.ok(), `GET /api/categories falló (${res.status()})`).toBeTruthy();
  const categorias = (await res.json()) as CategoriaApi[];
  const cat = categorias.find(
    (c) => c.nombre.trim().toLowerCase() === CATEGORIA_PINATAS.toLowerCase(),
  );
  if (!cat) throw new Error(`No existe la categoría ${CATEGORIA_PINATAS} en el backend.`);
  return cat.id;
}

/**
 * Garantiza que exista un producto modificable marcado `[E2E]` en la categoría
 * "Piñatas" y lo devuelve. Es IDEMPOTENTE: si ya existe uno (de una corrida
 * anterior) lo reutiliza; solo crea uno la primera vez para no acumular
 * productos en el catálogo. Se puede forzar por id con `E2E_PRODUCTO_MOD_ID`.
 */
export async function asegurarProductoModificable(
  request: APIRequestContext,
): Promise<ProductoApi> {
  const productos = await listarProductos(request);

  const idForzado = process.env.E2E_PRODUCTO_MOD_ID;
  if (idForzado) {
    const encontrado = productos.find((p) => p.id === Number(idForzado));
    if (encontrado) return encontrado;
  }

  const existente = productos.find(
    (p) =>
      p.activo &&
      p.permite_modificaciones &&
      p.categoria === CATEGORIA_PINATAS &&
      p.nombre.startsWith(MARCA_E2E),
  );
  if (existente) return existente;

  // No existe: se crea UNA vez (multipart/form-data, POST /api/productos/new).
  const categoriaId = await idCategoriaPinatas(request);
  const res = await request.post(`${API_BASE}/api/productos/new`, {
    multipart: {
      nombre: `${MARCA_E2E} Producto modificable`,
      descripcion: "Producto de prueba automatizada E2E. Permite modificaciones. Ignorar.",
      precio_base: "150",
      categoria_id: String(categoriaId),
      activo: "true",
      permite_modificaciones: "true",
      requiere_anticipo: "false",
    },
  });
  expect(res.ok(), `No se pudo crear el producto modificable [E2E] (${res.status()})`).toBeTruthy();
  const creado = (await res.json()) as { id: number; nombre: string; categoria_id: number };
  return {
    id: creado.id,
    nombre: creado.nombre,
    activo: true,
    permite_modificaciones: true,
    requiere_anticipo: false,
    categoria_id: creado.categoria_id,
    categoria: CATEGORIA_PINATAS,
  };
}

/**
 * Lee la disponibilidad REAL del mes siguiente y devuelve el primer día
 * habilitado (>= min_fecha). No hardcodea ninguna fecha: consulta
 * GET /api/disponibilidad/dias del backend real.
 */
async function primerDiaDisponibleProximoMes(request: APIRequestContext): Promise<string> {
  const ahora = new Date();
  const prox = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
  const anio = prox.getFullYear();
  const mes = prox.getMonth() + 1;
  const desde = `${anio}-${pad2(mes)}-01`;
  const ultimo = new Date(anio, mes, 0).getDate();
  const hasta = `${anio}-${pad2(mes)}-${pad2(ultimo)}`;

  const res = await request.get(
    `${API_BASE}/api/disponibilidad/dias?desde=${desde}&hasta=${hasta}`,
  );
  expect(res.ok(), `GET /api/disponibilidad/dias falló (${res.status()})`).toBeTruthy();
  const body = (await res.json()) as { min_fecha: string; dias: DiaDisponibilidad[] };

  const dia = body.dias.find((d) => d.disponible && d.fecha >= body.min_fecha);
  if (!dia) {
    throw new Error(
      `No hay ningún día disponible en ${anio}-${pad2(mes)} para la prueba real.`,
    );
  }
  return dia.fecha;
}

/**
 * En el paso Fecha del wizard: navega al mes siguiente, elige un día habilitado
 * real (leído de la disponibilidad del backend) y espera a que la UI confirme la
 * disponibilidad. Devuelve la fecha ISO elegida.
 */
export async function elegirDiaDisponibleProximoMes(
  page: Page,
  request: APIRequestContext,
): Promise<string> {
  await expect(page.getByRole("heading", { name: "¿Para cuándo la quieres?" })).toBeVisible();

  const fecha = await primerDiaDisponibleProximoMes(request);

  await page.getByRole("button", { name: "Mes siguiente" }).click();
  // El botón del día se habilita solo cuando la disponibilidad del mes cargó;
  // el clic auto-espera a que sea accionable (no deshabilitado).
  await page.getByRole("button", { name: fecha, exact: true }).click();

  await expect(
    page.getByText("¡Disponible! Continúa para revisar el resumen."),
  ).toBeVisible();
  return fecha;
}
