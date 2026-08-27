import { type Page, type Route, expect } from "@playwright/test";

// ────────────────────────────────────────────────────────────────────────────
// Helpers y fixtures para los E2E del proceso de pedidos.
//
// Interceptan la API del backend (rutas bajo /api/) con `page.route` para que
// los edge cases y errores sean DETERMINISTAS y NO toquen la BD real (Neon). Los
// cuerpos de error respetan la forma real `ProblemDetails` (RFC 7807) que
// devuelve el backend (`src/common/errors.ts`).
//
// NO valen para el happy-path de INTEGRACIÓN REAL (ver
// `pedidos-integracion-real.spec.ts`), que sí golpea front+backend+Neon.
// ────────────────────────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, "0");

export const hoyISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/** Mes visible ("YYYY-MM") del mes SIGUIENTE al actual (siempre a futuro). */
export const mesProximoISO = (): string => {
  const d = new Date();
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}`;
};

/** Día 15 del mes SIGUIENTE ("YYYY-MM-15"): siempre > hoy, siempre existe. */
export const dia15ProximoMesISO = (): string => `${mesProximoISO()}-15`;

/** Cuerpo de error con la forma real de `ProblemDetails` del backend. */
export const problemDetails = (status: number, detail: string, code = "ERROR") => ({
  type: `https://httpstatuses.com/${status}`,
  title: status === 400 ? "Bad Request" : status === 409 ? "Conflict" : "Error",
  status,
  detail,
  code,
});

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

// ---- Builders de payloads (espejo de los DTOs de salida del backend) ----

interface ProductoOverrides {
  id?: number;
  nombre?: string;
  precio_base?: number;
  activo?: boolean;
  permite_modificaciones?: boolean;
  requiere_anticipo?: boolean;
  tiempo?: number;
  imagenes?: {
    id: number;
    url: string;
    alt: string;
    orden: number;
    es_portada?: boolean;
  }[];
}

const productoDetalle = (o: ProductoOverrides = {}) => ({
  id: o.id ?? 1,
  nombre: o.nombre ?? `Producto ${o.id ?? 1}`,
  descripcion: "Hecho a mano con dedicación.",
  precio_base: o.precio_base ?? 350,
  categoria_id: 1,
  activo: o.activo ?? true,
  permite_modificaciones: o.permite_modificaciones ?? true,
  requiere_anticipo: o.requiere_anticipo ?? false,
  componentes: [],
  imagenes: o.imagenes ?? [],
});

const infoPedido = (o: ProductoOverrides = {}) => ({
  id: o.id ?? 1,
  nombre: o.nombre ?? `Producto ${o.id ?? 1}`,
  descripcion: "Hecho a mano con dedicación.",
  precio_base: o.precio_base ?? 350,
  categoria_id: 1,
  categoria: "Piñatas",
  permite_modificaciones: o.permite_modificaciones ?? true,
  requiere_anticipo: o.requiere_anticipo ?? false,
  tiempo_total_estimado_minutos: o.tiempo ?? 120,
  componentes: [],
});

const contactoConfig = {
  facebook_page_url: "https://www.facebook.com/AniaHechoAMano",
  messenger_url_template: "https://m.me/AniaHechoAMano?ref={ref}",
};

/** Detalle de pedido de salida (`PedidoDetalleDto`) para GET /api/pedidos/:id. */
export const pedidoDetalleMock = (o: Record<string, unknown> = {}) => ({
  id: 42,
  cliente_id: 7,
  nombre: null,
  referencia_publica: "AHM-2026-0007",
  fecha_solicitud: "2026-07-17T10:00:00.000Z",
  fecha_entrega_solicitada: null,
  fecha_entrega_acordada: null,
  estado: "PENDIENTE_CONFIRMACION",
  precio_final_total: 350,
  anticipo_pagado: 0,
  notas_admin: null,
  maps_url_omitida: false,
  entrega: {
    id: 1,
    calle: "Av. Siempre Viva",
    numero_casa: "742",
    referencia: "Portón azul",
    municipio: "Springfield",
    maps_url: "https://maps.google.com/?q=ania",
    notas: "Tocar el timbre",
  },
  cliente: { nombre: "Marge Bouvier" },
  cliente_nombre: "Marge Bouvier",
  producto_id: 1,
  categoria: "Piñatas",
  imagen_referencia_url: null,
  imagen_producto_id: null,
  productos: [
    {
      id: 100,
      descripcion_cliente: "Pedido tal cual: Piñata de Estrella",
      es_modificacion: false,
      precio_estimado_ia: null,
      precio_fijado_admin: 350,
      tiempo_total_estimado_minutos: 120,
      foto_referencia_url: null,
      imagenes: [],
      componentes: [],
    },
  ],
  ...o,
});

/** Item de bandeja (`PedidoHistorialListItemDto`) para GET /api/pedidos?estado=. */
export const solicitudMock = (o: Record<string, unknown> = {}) => ({
  ...pedidoDetalleMock(),
  ...o,
});

export interface MockOptions {
  /** `permite_modificaciones` de los productos por defecto (default true). */
  permiteModificaciones?: boolean;
  /** `requiere_anticipo` de los productos por defecto (default false). */
  requiereAnticipo?: boolean;
  /** Overrides por id de producto. */
  productos?: Record<number, ProductoOverrides>;
  /** Si true, `GET /productos/:id/info-pedido` devuelve `null`. */
  sinInfoPedido?: boolean;
  /** Respuesta cruda de `GET /productos/:id` para probar payloads inválidos. */
  respuestaDetalleProducto?: unknown;
  /** Respuesta cruda de `GET /productos/:id/info-pedido` para payloads inválidos. */
  respuestaInfoPedido?: unknown;
  /** Días ("YYYY-MM-DD") que `GET /disponibilidad/dias` marca NO disponibles. */
  diasBloqueados?: string[];
  /** Respuesta de `POST /disponibilidad/evaluar` (default: disponible). */
  evaluar?: { disponible: boolean; motivos: string[]; sugerencias: string[] };
  /** Handler propio para `POST /pedidos/solicitud` (para forzar errores/red caída). */
  solicitud?: (route: Route) => Promise<void> | void;
  /** Status de la subida de fotos (`POST .../imagenes`). Default 201 (ok). */
  imagenesStatus?: number;
  /** Listas de la bandeja admin por estado. */
  orders?: { COTIZANDO?: unknown[]; PENDIENTE_CONFIRMACION?: unknown[] };
  /** Detalle admin para `GET /pedidos/:id`. */
  pedidoDetalle?: unknown;
}

/**
 * Instala TODOS los mocks de API (rutas bajo /api/) en un único router. Las
 * rutas no contempladas responden `[]` para no golpear el backend real.
 */
export async function installApiMocks(page: Page, opts: MockOptions = {}): Promise<void> {
  const overridesProducto = (id: number): ProductoOverrides => ({
    id,
    // El nombre del detalle debe coincidir con el del card del catálogo
    // (GET /productos) para el mismo id; si no, el heading del detalle no
    // casaría con el nombre por el que se navegó.
    nombre: id === 1 ? "Piñata de Estrella" : undefined,
    permite_modificaciones: opts.permiteModificaciones ?? true,
    requiere_anticipo: opts.requiereAnticipo ?? false,
    ...opts.productos?.[id],
  });

  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*?\/api\//, ""); // ej. "productos/1/info-pedido"

    // --- Catálogo público ---
    if (method === "GET" && path === "categories") {
      return json(route, 200, [
        { id: 1, nombre: "Postres" },
        { id: 2, nombre: "Piñatas" },
      ]);
    }

    // --- Producto: info de pedido (debe ir ANTES del detalle) ---
    let m = path.match(/^productos\/(\d+)\/info-pedido$/);
    if (method === "GET" && m) {
      if (opts.sinInfoPedido) return json(route, 200, null);
      const respuesta =
        opts.respuestaInfoPedido === undefined
          ? infoPedido(overridesProducto(Number(m[1])))
          : opts.respuestaInfoPedido;
      return json(route, 200, respuesta);
    }

    // --- Producto: detalle ---
    m = path.match(/^productos\/(\d+)$/);
    if (method === "GET" && m) {
      const respuesta =
        opts.respuestaDetalleProducto === undefined
          ? productoDetalle(overridesProducto(Number(m[1])))
          : opts.respuestaDetalleProducto;
      return json(route, 200, respuesta);
    }

    // --- Catálogo: listado de productos ---
    if (method === "GET" && path === "productos") {
      return json(route, 200, [
        {
          id: 1,
          nombre: "Piñata de Estrella",
          descripcion: "Piñata artesanal de estrella.",
          precio_base: 350,
          activo: true,
          permite_modificaciones: true,
          requiere_anticipo: false,
          fecha_creacion: "2026-01-01T00:00:00.000Z",
          tiene_historial: true,
          categoria_id: 1,
          categoria: "Postres",
          tags_por_producto: ["Estrella"],
          imagenes: [],
        },
      ]);
    }

    // --- Disponibilidad: días del mes ---
    if (method === "GET" && path === "disponibilidad/dias") {
      const desde = url.searchParams.get("desde") ?? hoyISO();
      const hasta = url.searchParams.get("hasta") ?? desde;
      const bloqueados = new Set(opts.diasBloqueados ?? []);
      const dias: { fecha: string; disponible: boolean; motivos: string[] }[] = [];
      const d = new Date(`${desde}T00:00:00`);
      const fin = new Date(`${hasta}T00:00:00`);
      while (d <= fin) {
        const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        const disponible = !bloqueados.has(iso);
        dias.push({ fecha: iso, disponible, motivos: disponible ? [] : ["Día bloqueado en la agenda."] });
        d.setDate(d.getDate() + 1);
      }
      return json(route, 200, {
        desde,
        hasta,
        min_fecha: hoyISO(),
        dias_anticipacion_min: 0,
        capacidad_minutos_dia: 480,
        dias,
      });
    }

    // --- Disponibilidad: evaluar una fecha ---
    if (method === "POST" && path === "disponibilidad/evaluar") {
      return json(route, 200, opts.evaluar ?? { disponible: true, motivos: [], sugerencias: [] });
    }

    // --- Config de contacto ---
    if (method === "GET" && path === "config/contacto") {
      return json(route, 200, contactoConfig);
    }

    // --- Crear solicitud pública (fase 1) ---
    if (method === "POST" && path === "pedidos/solicitud") {
      if (opts.solicitud) return opts.solicitud(route);
      const body = req.postDataJSON() as {
        productos: { es_modificacion?: boolean; descripcion_cliente?: string }[];
      };
      const hayMod = body.productos.some((p) => p.es_modificacion);
      return json(route, 201, {
        ...pedidoDetalleMock(),
        estado: hayMod ? "COTIZANDO" : "PENDIENTE_CONFIRMACION",
        productos: body.productos.map((p, i) => ({
          id: 100 + i,
          descripcion_cliente: p.descripcion_cliente ?? "Pedido tal cual",
          es_modificacion: Boolean(p.es_modificacion),
          precio_estimado_ia: null,
          precio_fijado_admin: null,
          tiempo_total_estimado_minutos: null,
          foto_referencia_url: null,
          imagenes: [],
          componentes: [],
        })),
      });
    }

    // --- Subida de fotos (fase 2) ---
    if (method === "POST" && /^pedidos\/\d+\/productos\/\d+\/imagenes$/.test(path)) {
      const status = opts.imagenesStatus ?? 201;
      if (status >= 400) {
        return json(route, status, problemDetails(status, "No se pudieron guardar las imágenes."));
      }
      return json(route, status, [{ id: 1, url: "/uploads/pedidos/1.jpg", alt: null, orden: 0 }]);
    }

    // --- Bandeja admin: listado por estado ---
    if (method === "GET" && path === "pedidos") {
      const estado = url.searchParams.get("estado") ?? "";
      const data = (opts.orders?.[estado as "COTIZANDO" | "PENDIENTE_CONFIRMACION"] ?? []) as unknown[];
      return json(route, 200, {
        data,
        meta: { page: 1, limit: 200, total: data.length, total_pages: 1 },
      });
    }

    // --- Detalle admin de un pedido ---
    if (method === "GET" && /^pedidos\/\d+$/.test(path)) {
      return json(route, 200, opts.pedidoDetalle ?? pedidoDetalleMock());
    }

    // Fallback: nada que golpear el backend real.
    return json(route, 200, []);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers de flujo (localizadores semánticos)
// ────────────────────────────────────────────────────────────────────────────

/** Navega al detalle de un producto y espera a que sea interactivo. */
export async function irADetalle(page: Page, id = 1, slug = "pinatas"): Promise<void> {
  await page.goto(`/categoria/${slug}/producto/${id}`);
  await expect(page.getByRole("button", { name: "Agregar a mi pedido" })).toBeVisible();
}

/** Agrega el producto actual "tal cual" y espera aterrizar en el wizard. */
export async function agregarTalCual(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Agregar a mi pedido" }).click();
  await expect(page).toHaveURL(/\/pedido$/);
}

/** Selecciona modo modificación, escribe la descripción y agrega al carrito. */
export async function agregarModificacion(
  page: Page,
  descripcion: string,
): Promise<void> {
  await page.getByText("Con una modificación", { exact: true }).click();
  await page.getByLabel("Describe tu modificación *").fill(descripcion);
  await page.getByRole("button", { name: "Agregar a mi pedido" }).click();
  await expect(page).toHaveURL(/\/pedido$/);
}

/** Rellena el paso Contacto con datos válidos por defecto. */
export async function llenarContacto(
  page: Page,
  { nombre = "Marge Bouvier", telefono = "5512345678" } = {},
): Promise<void> {
  await expect(page.getByRole("heading", { name: "¿Cómo te contactamos?" })).toBeVisible();
  await page.getByLabel("Nombre *").fill(nombre);
  await page.getByLabel("Teléfono").fill(telefono);
}

/** Rellena el paso Dirección; con `maps` evita el soft-gate de Google Maps. */
export async function llenarDireccion(
  page: Page,
  { maps = true } = {},
): Promise<void> {
  await expect(page.getByRole("heading", { name: "¿Dónde entregamos?" })).toBeVisible();
  await page.getByLabel("Calle").fill("Av. Siempre Viva");
  await page.getByLabel("Número / casa").fill("742");
  if (maps) {
    await page.getByLabel("Enlace de Google Maps").fill("https://maps.google.com/?q=ania");
  }
}

export const clickContinuar = (page: Page) => page.getByRole("button", { name: "Continuar" }).click();

/** Navega al mes siguiente en el calendario y selecciona el día 15. */
export async function seleccionarDia15ProximoMes(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Mes siguiente" }).click();
  const dia = dia15ProximoMesISO();
  await page.getByRole("button", { name: dia, exact: true }).click();
  return dia;
}

/** PNG 1x1 transparente para setInputFiles (foto de referencia de modificación). */
export const pngFake = {
  name: "referencia.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  ),
};
