import {
  type APIRequestContext,
  type APIResponse,
  type Page,
  expect,
} from "@playwright/test";
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

export interface PedidoConfirmadoE2E {
  id: number;
  referencia_publica: string;
  seguimiento_token_publico: string;
  cliente_nombre: string;
  fecha_entrega_acordada: string;
  estado: string;
}

export interface PedidoAfectadoE2E {
  id: number;
  pedido_id: number;
  referencia_publica: string | null;
  contactado: boolean;
  resolucion: "CANCELADO" | "RETRASADO" | "OBSOLETO" | null;
  nueva_fecha: string | null;
  cliente: { nombre: string };
}

export interface EmergenciaListaE2E {
  id: number;
  desde: string;
  hasta: string;
  motivo: string | null;
  activo: boolean;
}

export interface EmergenciaDetalleE2E extends EmergenciaListaE2E {
  dias_bloqueados: string[];
  dias_con_bloqueo_manual: string[];
  afectados: PedidoAfectadoE2E[];
}

export interface SeguimientoPublicoE2E {
  referencia_publica: string | null;
  estado: string | null;
  retrasado: boolean;
  fecha_entrega_solicitada: string | null;
  fecha_entrega_acordada: string | null;
}

export interface CrearEmergenciaE2E {
  desde: string;
  hasta: string;
  motivo: string;
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
export async function obtenerDiaDisponibleFuturo(request: APIRequestContext): Promise<string> {
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

  const fecha = await obtenerDiaDisponibleFuturo(request);

  await page.getByRole("button", { name: "Mes siguiente" }).click();
  // El botón del día se habilita solo cuando la disponibilidad del mes cargó;
  // el clic auto-espera a que sea accionable (no deshabilitado).
  await page.getByRole("button", { name: fecha, exact: true }).click();

  await expect(
    page.getByText("¡Disponible! Continúa para revisar el resumen."),
  ).toBeVisible();
  return fecha;
}

interface PedidoDetalleMinimoE2E {
  id: number;
  referencia_publica: string | null;
  seguimiento_token_publico: string | null;
  estado: string | null;
  fecha_entrega_acordada: string | null;
}

const leerJsonOk = async <T>(res: APIResponse, operacion: string): Promise<T> => {
  expect(res.ok(), `${operacion} falló (${res.status()})`).toBeTruthy();
  return (await res.json()) as T;
};

const leerJsonAdminOk = async <T>(res: APIResponse, operacion: string): Promise<T> => {
  if (res.status() === 401 || res.status() === 403) {
    throw new Error(
      `${operacion} fue rechazado (${res.status()}). El backend real debe arrancar con ` +
        "EMERGENCIAS_ADMIN_ENABLED=true; no se habilitan mocks en este E2E.",
    );
  }
  return leerJsonOk<T>(res, operacion);
};

/** Verifica pronto que el backend exponga las rutas admin de emergencias. */
export async function assertEmergenciasAdminEnabled(
  request: APIRequestContext,
): Promise<void> {
  await listarEmergencias(request);
}

/** Lista emergencias reales, incluyendo las retiradas lógicamente. */
export async function listarEmergencias(
  request: APIRequestContext,
): Promise<EmergenciaListaE2E[]> {
  const res = await request.get(`${API_BASE}/api/agenda/emergencias`);
  const body = await leerJsonAdminOk<unknown>(res, "GET /api/agenda/emergencias");
  if (!Array.isArray(body)) throw new Error("La lista real de emergencias no es un arreglo.");
  return body as EmergenciaListaE2E[];
}

/** Crea una emergencia por API; la UI del journey no usa este atajo. */
export async function crearEmergenciaReal(
  request: APIRequestContext,
  datos: CrearEmergenciaE2E,
): Promise<EmergenciaDetalleE2E> {
  if (!datos.motivo.startsWith(MARCA_E2E)) {
    throw new Error(`El motivo de emergencia debe comenzar con ${MARCA_E2E}.`);
  }
  const res = await request.post(`${API_BASE}/api/agenda/emergencias`, { data: datos });
  return leerJsonAdminOk<EmergenciaDetalleE2E>(res, "POST /api/agenda/emergencias");
}

/** Obtiene el detalle real de una emergencia por su id descubierto. */
export async function obtenerEmergenciaReal(
  request: APIRequestContext,
  emergenciaId: number,
): Promise<EmergenciaDetalleE2E> {
  const res = await request.get(`${API_BASE}/api/agenda/emergencias/${emergenciaId}`);
  return leerJsonAdminOk<EmergenciaDetalleE2E>(
    res,
    `GET /api/agenda/emergencias/${emergenciaId}`,
  );
}

/** Espera a que la emergencia creada por la UI aparezca en la lista real. */
export async function esperarEmergenciaPorMotivo(
  request: APIRequestContext,
  motivo: string,
  timeoutMs = 10_000,
): Promise<EmergenciaDetalleE2E> {
  const limite = Date.now() + timeoutMs;
  do {
    const encontrada = (await listarEmergencias(request)).find((item) => item.motivo === motivo);
    if (encontrada) return obtenerEmergenciaReal(request, encontrada.id);
    await new Promise((resolve) => setTimeout(resolve, 200));
  } while (Date.now() < limite);
  throw new Error(`No apareció la emergencia real con motivo "${motivo}".`);
}

/** Poll de detalle para observar una mutación persistida por la UI. */
export async function esperarDetalleEmergencia(
  request: APIRequestContext,
  emergenciaId: number,
  cumple: (detalle: EmergenciaDetalleE2E) => boolean,
  timeoutMs = 10_000,
): Promise<EmergenciaDetalleE2E> {
  const limite = Date.now() + timeoutMs;
  let ultimo: EmergenciaDetalleE2E | undefined;
  do {
    ultimo = await obtenerEmergenciaReal(request, emergenciaId);
    if (cumple(ultimo)) return ultimo;
    await new Promise((resolve) => setTimeout(resolve, 200));
  } while (Date.now() < limite);
  throw new Error(`El detalle de emergencia ${emergenciaId} no alcanzó el estado esperado.`);
}

/** Crea y confirma un pedido fijo usando un producto real descubierto por API. */
export async function crearPedidoConfirmadoE2E(
  request: APIRequestContext,
  fechaEntrega: string,
): Promise<PedidoConfirmadoE2E> {
  const producto = await descubrirProductoTalCual(request);
  if (producto.requiere_anticipo) {
    throw new Error(
      `El producto real ${producto.id} requiere anticipo y no puede producir CONFIRMADO. ` +
        "Usa E2E_PRODUCTO_ID con un producto tal cual sin anticipo.",
    );
  }
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const clienteNombre = `${MARCA_E2E} Cliente emergencia ${runId}`;
  const telefono = `55${Date.now().toString().slice(-8)}`;
  const creadoRes = await request.post(`${API_BASE}/api/pedidos/solicitud`, {
    data: {
      cliente_nuevo: { nombre: clienteNombre, telefono },
      fecha_entrega_solicitada: fechaEntrega,
      productos: [
        { producto_id: producto.id, origen: "catalogo", es_modificacion: false },
      ],
    },
  });
  const creado = await leerJsonOk<PedidoDetalleMinimoE2E>(
    creadoRes,
    "POST /api/pedidos/solicitud",
  );
  expect(creado.id).toBeGreaterThan(0);
  expect(creado.referencia_publica).toBeTruthy();
  expect(creado.seguimiento_token_publico).toBeTruthy();

  const confirmadoRes = await request.post(`${API_BASE}/api/pedidos/${creado.id}/confirmar`, {
    data: { fecha_entrega_acordada: fechaEntrega },
  });
  const confirmado = await leerJsonOk<PedidoDetalleMinimoE2E>(
    confirmadoRes,
    `POST /api/pedidos/${creado.id}/confirmar`,
  );
  expect(confirmado.estado).toBe("CONFIRMADO");
  expect(confirmado.fecha_entrega_acordada?.slice(0, 10)).toBe(fechaEntrega);

  return {
    id: creado.id,
    referencia_publica: confirmado.referencia_publica ?? creado.referencia_publica!,
    seguimiento_token_publico:
      confirmado.seguimiento_token_publico ?? creado.seguimiento_token_publico!,
    cliente_nombre: clienteNombre,
    fecha_entrega_acordada: confirmado.fecha_entrega_acordada!,
    estado: confirmado.estado!,
  };
}

/** Marca o desmarca un afectado por API y devuelve la proyección persistida. */
export async function marcarContactadoEmergencia(
  request: APIRequestContext,
  emergenciaId: number,
  afectadoId: number,
  contactado: boolean,
): Promise<PedidoAfectadoE2E> {
  const res = await request.patch(
    `${API_BASE}/api/agenda/emergencias/${emergenciaId}/afectados/${afectadoId}/contactado`,
    { data: { contactado } },
  );
  return leerJsonAdminOk<PedidoAfectadoE2E>(
    res,
    `PATCH /api/agenda/emergencias/${emergenciaId}/afectados/${afectadoId}/contactado`,
  );
}

/** Retiro lógico de una emergencia; no borra datos ni se usa desde la UI. */
export async function retirarEmergenciaReal(
  request: APIRequestContext,
  emergenciaId: number,
): Promise<EmergenciaDetalleE2E> {
  const res = await request.post(`${API_BASE}/api/agenda/emergencias/${emergenciaId}/retirar`);
  return leerJsonAdminOk<EmergenciaDetalleE2E>(
    res,
    `POST /api/agenda/emergencias/${emergenciaId}/retirar`,
  );
}

/** Lee el DTO público, separado de la vista de seguimiento. */
export async function obtenerSeguimientoPublico(
  request: APIRequestContext,
  token: string,
): Promise<SeguimientoPublicoE2E> {
  const res = await request.get(
    `${API_BASE}/api/pedidos/seguimiento/${encodeURIComponent(token)}`,
  );
  return leerJsonOk<SeguimientoPublicoE2E>(
    res,
    "GET /api/pedidos/seguimiento/:token",
  );
}
