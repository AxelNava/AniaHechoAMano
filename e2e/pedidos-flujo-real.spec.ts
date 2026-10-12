import { test, expect, type APIRequestContext, type Browser, type Locator, type Page, type Request } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { E2E_APP_ORIGIN, loadE2ECredentials } from "./helpers/oidc";
import { llenarContacto, llenarDireccion, clickContinuar } from "./helpers/pedidoForm";
import { API_BASE, CATEGORIA_PINATAS, IMAGEN_FIXTURE, MARCA_E2E, SLUG_PINATAS, elegirDiaDisponibleProximoMes, listarProductos, type ProductoApi } from "./helpers/real";

type ExpectedStatus = "ESPERANDO_ANTICIPO" | "CONFIRMADO";
type RunState = { version: 1; run_id: string; marker: string; pedido_id: number; referencia_publica: string; producto_id: number; line_count: number; quote_price: number; quote_minutes: number; expected_status: ExpectedStatus };
type ApiOrderLine = { id: number; descripcion_cliente: string | null; es_modificacion: boolean; precio_fijado_admin: number | null; tiempo_total_estimado_minutos: number | null; imagenes: unknown[] };
type ApiOrder = { id: number; referencia_publica: string; estado: string; fecha_entrega_acordada: string | null; cliente_nombre?: string; productos: ApiOrderLine[] };
type FixedFixture = { id: number; name: string; price: number; duration: number };
type JsonResponse = { ok(): boolean; status(): number; json(): Promise<unknown> };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isLine = (value: unknown): value is ApiOrderLine =>
  isRecord(value) && typeof value.id === "number" && (value.descripcion_cliente === null || typeof value.descripcion_cliente === "string") &&
  typeof value.es_modificacion === "boolean" && (value.precio_fijado_admin === null || typeof value.precio_fijado_admin === "number") &&
  (value.tiempo_total_estimado_minutos === null || typeof value.tiempo_total_estimado_minutos === "number") && Array.isArray(value.imagenes);
const positiveNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
const runId = (): string => {
  const value = process.env.E2E_RUN_ID?.trim() ?? "";
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value)) throw new Error("[E2E config] E2E_RUN_ID must be an explicit unique safe identifier.");
  if (!process.env.E2E_CREDENTIALS_FILE?.trim()) throw new Error("[E2E config] E2E_CREDENTIALS_FILE must point to the credentials JSON file.");
  return value;
};
const stateFile = (id: string): string => resolve(process.cwd(), "playwright", ".auth", `pedidos-flujo-${id}.json`);
const fixedReceiptId = (id: string): string => `${id}-fijo`;
const fixedFixtureName = (id: string): string => `${MARCA_E2E} ${id}-fixed-fixture`;
const fixedSnapshotDescription = (id: string): string => `Pedido tal cual: ${MARCA_E2E} ${id}-fixed-fixture`;
const orderFromJson = (value: unknown): ApiOrder => {
  if (!isRecord(value) || !positiveNumber(value.id) || typeof value.referencia_publica !== "string" || !value.referencia_publica.trim() || typeof value.estado !== "string" || (value.fecha_entrega_acordada !== null && typeof value.fecha_entrega_acordada !== "string") || (value.cliente_nombre !== undefined && typeof value.cliente_nombre !== "string") || !Array.isArray(value.productos) || !value.productos.every(isLine)) {
    throw new Error("[E2E real] The order API response did not match the expected detail contract.");
  }
  return value as unknown as ApiOrder;
};
const json = async <T>(response: JsonResponse, label: string): Promise<T> => {
  if (!response.ok()) throw new Error(`[E2E real] ${label} failed (${response.status()}).`);
  try { return (await response.json()) as T; } catch { throw new Error(`[E2E real] ${label} returned an unreadable response.`); }
};
const orderFromResponse = async (response: JsonResponse, label: string): Promise<ApiOrder> => orderFromJson(await json<unknown>(response, label));

const readRunStateFile = (id: string, missingMessage: string): RunState => {
  let state: unknown;
  try { state = JSON.parse(readFileSync(stateFile(id), "utf8")); } catch { throw new Error(missingMessage); }
  const expected = isRecord(state) ? state.expected_status : undefined;
  const valid = isRecord(state) && state.version === 1 && state.run_id === id && typeof state.marker === "string" && state.marker.startsWith(MARCA_E2E) &&
    positiveNumber(state.pedido_id) && typeof state.referencia_publica === "string" && state.referencia_publica.length > 0 && positiveNumber(state.producto_id) &&
    positiveNumber(state.line_count) && positiveNumber(state.quote_price) && positiveNumber(state.quote_minutes) &&
    (expected === "ESPERANDO_ANTICIPO" || expected === "CONFIRMADO");
  if (!valid) throw new Error("[E2E real] Run state does not match the bounded order-flow schema.");
  return state as unknown as RunState;
};
const readRunState = (): RunState => readRunStateFile(runId(), "[E2E real] Run state is missing or invalid; run comprador_crea first.");
const readFixedRunState = (id: string): RunState => readRunStateFile(fixedReceiptId(id), "[E2E real] Fixed receipt is missing or invalid; use admin_confirma to create it once.");
const writeRunState = (state: RunState): void => {
  const file = stateFile(state.run_id);
  mkdirSync(dirname(file), { recursive: true });
  try { writeFileSync(file, `${JSON.stringify(state)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 }); }
  catch { if (existsSync(file)) throw new Error("[E2E real] Run state exists; choose a new E2E_RUN_ID."); throw new Error("[E2E real] Could not persist non-secret run state before upload."); }
};

const apiPath = (url: string): string => new URL(url).pathname;
const isPostPath = (request: Request, suffix: string): boolean => request.method() === "POST" && apiPath(request.url()).endsWith(suffix);
const sessionToken = (page: Page): Promise<string | null> => page.evaluate(() => {
  for (const name of Object.keys(window.localStorage)) {
    if (!name.startsWith("oidc.user:")) continue;
    try {
      const user = JSON.parse(window.localStorage.getItem(name) ?? "") as { access_token?: unknown };
      if (typeof user.access_token === "string" && user.access_token.trim()) return user.access_token;
    } catch { /* Keep credentials and unrelated storage out of diagnostics. */ }
  }
  return null;
});
const loginRole = async (page: Page, role: "admin" | "comprador"): Promise<void> => {
  const credentials = loadE2ECredentials().roles[role];
  if (!credentials) throw new Error(`[E2E auth] Credentials for ${role} are required.`);
  try {
    await page.goto(`${E2E_APP_ORIGIN}/login`, { waitUntil: "domcontentloaded" });
    const username = page.locator("#Username");
    const password = page.locator("#Password");
    const loginButton = page.locator('button[name="button"][value="login"]');
    await Promise.all([expect(username).toBeVisible({ timeout: 15_000 }), expect(password).toBeVisible({ timeout: 15_000 }), expect(loginButton).toBeVisible({ timeout: 15_000 })]);
    await username.fill(credentials.username);
    await password.fill(credentials.password);
    await loginButton.click();
  } catch { throw new Error(`[E2E auth] ${role} login form or submit failed; credentials were not logged.`); }
  try { await page.waitForURL((url) => url.origin === E2E_APP_ORIGIN && !["/login", "/auth/callback"].includes(url.pathname), { timeout: 30_000 }); }
  catch { throw new Error(`[E2E auth] ${role} OIDC login did not complete; credentials were not logged.`); }
  if (!(await sessionToken(page))) throw new Error(`[E2E auth] ${role} session was not stored after OIDC login.`);
};
const getOrderWithSession = async (request: APIRequestContext, page: Page, orderId: number): Promise<ApiOrder> => {
  const token = await sessionToken(page);
  if (!token) throw new Error("[E2E real] Fresh OIDC session has no access token in memory.");
  const response = await request.get(`${API_BASE}/api/pedidos/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
  return orderFromResponse(response, "GET own order detail");
};

const findExistingModifiableProduct = async (request: APIRequestContext): Promise<ProductoApi> => {
  const forcedId = process.env.E2E_PRODUCTO_MOD_ID ? Number(process.env.E2E_PRODUCTO_MOD_ID) : null;
  const productos = await listarProductos(request);
  const producto = productos.find((item) => (forcedId === null || item.id === forcedId) && item.activo && item.permite_modificaciones && item.categoria === CATEGORIA_PINATAS && item.nombre.startsWith(MARCA_E2E));
  if (!producto) throw new Error("[E2E real] No existing active [E2E] modifiable product found; no product was created.");
  return producto;
};
const configuredFixedProductId = (): number | null => {
  const text = process.env.E2E_PRODUCTO_FIJO_ID?.trim() ?? "";
  if (!text) return null;
  if (!/^[1-9][0-9]*$/.test(text)) throw new Error("[E2E config] E2E_PRODUCTO_FIJO_ID must be an explicit positive integer.");
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("[E2E config] E2E_PRODUCTO_FIJO_ID must be an explicit positive integer.");
  return value;
};
const loadFixedFixture = async (request: APIRequestContext, id: string, persistedProductId?: number): Promise<FixedFixture> => {
  const configuredId = configuredFixedProductId();
  const productId = persistedProductId ?? configuredId;
  if (productId === null || productId === undefined) throw new Error("[E2E config] E2E_PRODUCTO_FIJO_ID is required before creating the fixed receipt.");
  if (configuredId !== null && configuredId !== productId) throw new Error("[E2E real] Fixed receipt product id does not match E2E_PRODUCTO_FIJO_ID.");
  const name = fixedFixtureName(id);
  const products = await listarProductos(request);
  const product = products.find((item) => item.id === productId && item.activo && item.nombre === name && item.categoria === CATEGORIA_PINATAS && !item.permite_modificaciones && !item.requiere_anticipo);
  if (!product) throw new Error("[E2E real] The persisted fixed product id did not identify the exact active public fixture.");
  const options = await json<unknown>(await request.get(`${API_BASE}/api/productos/${productId}/opciones-pedido`), "Fixed fixture product options");
  const price = isRecord(options) && positiveNumber(options.precio_base) ? options.precio_base : null;
  const duration = isRecord(options) && positiveNumber(options.tiempo_total_estimado_minutos) ? options.tiempo_total_estimado_minutos : null;
  if (!isRecord(options) || options.id !== productId || options.nombre !== name || options.permite_modificaciones !== false || options.requiere_anticipo !== false || price === null || duration === null) throw new Error("[E2E real] Fixed fixture public options did not match the exact product, flags, price, and positive duration.");
  return { id: productId, name, price, duration };
};
const pad2 = (value: number) => String(value).padStart(2, "0");
const isoDate = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const findAvailableDate = async (request: APIRequestContext, minutes: number): Promise<string> => {
  const today = new Date();
  const todayIso = isoDate(today);
  for (let offset = 0; offset < 12; offset += 1) {
    const month = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const from = offset === 0 ? todayIso : isoDate(month);
    const until = isoDate(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    const body = await json<unknown>(await request.get(`${API_BASE}/api/disponibilidad/dias?desde=${from}&hasta=${until}&minutos_estimados=${encodeURIComponent(String(minutes))}`), "Availability lookup");
    const minFecha = isRecord(body) ? body.min_fecha : undefined;
    if (!isRecord(body) || typeof minFecha !== "string" || !Array.isArray(body.dias)) throw new Error("[E2E real] Availability response did not match its source contract.");
    const day = body.dias.find((item): item is { fecha: string; disponible: true } => isRecord(item) && typeof item.fecha === "string" && item.disponible === true && item.fecha >= minFecha && item.fecha >= todayIso);
    if (day) return day.fecha;
  }
  throw new Error("[E2E real] No available date was returned within the bounded calendar range.");
};
const selectAvailableDate = async (page: Page, dialog: Locator, request: APIRequestContext, minutes: number): Promise<string> => {
  const date = await findAvailableDate(request, minutes);
  for (let month = 0; month < 12; month += 1) {
    const day = dialog.getByRole("button", { name: date, exact: true });
    if (await day.count()) {
      await expect(day).toBeEnabled({ timeout: 15_000 });
      const evaluation = page.waitForResponse((response) => isPostPath(response.request(), "/api/disponibilidad/evaluar"));
      await day.click();
      const evaluated = await evaluation;
      if (!evaluated.ok()) throw new Error(`[E2E real] UI date evaluation failed (${evaluated.status()}).`);
      await expect(day).toHaveAttribute("aria-pressed", "true");
      return date;
    }
    await dialog.getByRole("button", { name: "Mes siguiente", exact: true }).click();
  }
  throw new Error("[E2E real] Sourced available date was not rendered by the admin calendar.");
};

const assertOwnPendingOrder = (order: ApiOrder, state: RunState): void => {
  const marked = order.productos.filter((linea) => linea.descripcion_cliente === state.marker && linea.es_modificacion);
  if (order.id !== state.pedido_id || order.referencia_publica !== state.referencia_publica || order.estado !== "COTIZANDO" || order.productos.length !== state.line_count || marked.length !== 1 || marked.some((linea) => linea.imagenes.length === 0)) throw new Error("[E2E real] Pre-quote GET did not match the exact own marker, id, and image state.");
};
const assertQuotedOrder = (order: ApiOrder, state: RunState, lineIds: number[], date: string): void => {
  if (order.id !== state.pedido_id || order.estado !== state.expected_status || order.fecha_entrega_acordada?.slice(0, 10) !== date || order.productos.length !== lineIds.length) throw new Error("[E2E real] Persisted quote status or delivery date did not match the expected contract.");
  for (const id of lineIds) {
    const line = order.productos.find((item) => item.id === id);
    if (!line || line.precio_fijado_admin !== state.quote_price || line.tiempo_total_estimado_minutos !== state.quote_minutes) throw new Error("[E2E real] Persisted quote price or minutes did not match dialog values.");
  }
};
const statusLabel: Record<ExpectedStatus, string> = { ESPERANDO_ANTICIPO: "Esperando anticipo", CONFIRMADO: "Confirmado" };
const assertFixedOrderOwnership = (order: ApiOrder, state: RunState, baseRunId: string, fixture: FixedFixture): void => {
  const expectedDescription = fixedSnapshotDescription(baseRunId);
  const exactLines = order.productos.length === state.line_count && order.productos.every((line) => !line.es_modificacion && line.descripcion_cliente === expectedDescription && line.precio_fijado_admin === null && positiveNumber(line.tiempo_total_estimado_minutos));
  if (state.run_id !== fixedReceiptId(baseRunId) || state.producto_id !== fixture.id || fixture.name !== fixedFixtureName(baseRunId) || state.line_count !== 1 || state.quote_price !== fixture.price || state.quote_minutes !== fixture.duration || state.expected_status !== "CONFIRMADO" || order.id !== state.pedido_id || order.referencia_publica !== state.referencia_publica || !exactLines) throw new Error("[E2E real] Fixed order ownership guard rejected the receipt id, reference, product fixture, snapshot description, line count, or frozen minutes.");
};
const assertFixedConfirmed = (order: ApiOrder, state: RunState, baseRunId: string, fixture: FixedFixture, date: string): void => {
  assertFixedOrderOwnership(order, state, baseRunId, fixture);
  if (order.estado !== state.expected_status || order.fecha_entrega_acordada?.slice(0, 10) !== date) throw new Error("[E2E real] Fixed order confirmation did not persist the expected status and delivery date.");
};
const assertFixedConfirmedUi = async (page: Page, state: RunState): Promise<void> => {
  await expect(page.getByText(state.referencia_publica, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar pedido", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cotizar pedido", exact: true })).toHaveCount(0);
  await expect(page.getByText(statusLabel[state.expected_status], { exact: true })).toBeVisible();
};
const chooseFixedConfirmationDate = async (page: Page, dialog: Locator, request: APIRequestContext, order: ApiOrder, requestedDate: string | undefined, duration: number): Promise<string> => {
  if (requestedDate) {
    const requestedDay = dialog.getByRole("button", { name: requestedDate, exact: true });
    const unavailable = await dialog.getByText("Ese día ya no está disponible. Elige otro.", { exact: true }).count();
    if ((await requestedDay.count()) > 0 && (await requestedDay.isEnabled()) && (await requestedDay.getAttribute("aria-pressed")) === "true" && unavailable === 0) return requestedDate;
  }
  const minutes = order.productos.reduce((total, line) => total + (line.tiempo_total_estimado_minutos ?? 0), 0);
  return selectAvailableDate(page, dialog, request, positiveNumber(minutes) ? minutes : duration);
};
const confirmFixedOrderAsAdmin = async (browser: Browser, request: APIRequestContext, state: RunState, baseRunId: string, fixture: FixedFixture, requestedDate?: string): Promise<void> => {
  const adminContext = await browser.newContext();
  try {
    const adminPage = await adminContext.newPage();
    await loginRole(adminPage, "admin");
    let confirmationRequests = 0;
    adminPage.on("request", (request) => { if (isPostPath(request, `/api/pedidos/${state.pedido_id}/confirmar`)) confirmationRequests += 1; });
    const before = await getOrderWithSession(request, adminPage, state.pedido_id);
    if (before.estado !== "PENDIENTE_CONFIRMACION" && before.estado !== "CONFIRMADO") throw new Error("[E2E real] Fixed receipt is not pending confirmation or already confirmed; refusing to mutate it.");
    assertFixedOrderOwnership(before, state, baseRunId, fixture);
    if (before.estado === "CONFIRMADO") {
      const date = before.fecha_entrega_acordada?.slice(0, 10);
      if (!date) throw new Error("[E2E real] Already-confirmed fixed receipt has no persisted delivery date.");
      assertFixedConfirmed(before, state, baseRunId, fixture, date);
      await adminPage.goto(`${E2E_APP_ORIGIN}/admin/orders/${state.pedido_id}`);
      await assertFixedConfirmedUi(adminPage, state);
      const fresh = await getOrderWithSession(request, adminPage, state.pedido_id);
      assertFixedConfirmed(fresh, state, baseRunId, fixture, date);
      if (confirmationRequests !== 0) throw new Error("[E2E real] Read-only fixed receipt verification sent a second confirmation POST.");
      console.log("[E2E real] Existing fixed receipt was already CONFIRMADO; verified read-only and skipped confirmation POST.");
      return;
    }
    await adminPage.goto(`${E2E_APP_ORIGIN}/admin/orders/${state.pedido_id}`);
    await expect(adminPage.getByText(state.referencia_publica, { exact: true })).toBeVisible();
    await expect(adminPage.getByRole("button", { name: "Confirmar pedido", exact: true })).toBeVisible();
    await expect(adminPage.getByRole("button", { name: "Cotizar pedido", exact: true })).toHaveCount(0);
    await adminPage.getByRole("button", { name: "Confirmar pedido", exact: true }).click();
    const dialog = adminPage.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Confirmar pedido", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Mes siguiente", exact: true })).toBeVisible();
    const confirmationDate = await chooseFixedConfirmationDate(adminPage, dialog, request, before, requestedDate, fixture.duration);
    const confirmation = adminPage.waitForResponse((response) => isPostPath(response.request(), `/api/pedidos/${state.pedido_id}/confirmar`));
    await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
    const confirmationResponse = await confirmation;
    const confirmed = await orderFromResponse(confirmationResponse, "Fixed order confirmation");
    let confirmationBody: unknown;
    try { confirmationBody = confirmationResponse.request().postDataJSON(); } catch { throw new Error("[E2E real] Confirmation request body could not be read for dialog verification."); }
    if (confirmationRequests !== 1 || !confirmationResponse.ok() || !isRecord(confirmationBody) || confirmationBody.fecha_entrega_acordada !== confirmationDate) throw new Error("[E2E real] Fixed confirmation did not submit exactly once with the sourced date.");
    assertFixedConfirmed(confirmed, state, baseRunId, fixture, confirmationDate);
    const persisted = await getOrderWithSession(request, adminPage, state.pedido_id);
    assertFixedConfirmed(persisted, state, baseRunId, fixture, confirmationDate);
    await expect(dialog).toBeHidden();
    await assertFixedConfirmedUi(adminPage, state);
  } finally {
    await adminContext.close();
  }
};

test("fixed ownership guard rejects a foreign snapshot description", () => {
  const id = "guard-regression";
  const fixture: FixedFixture = { id: 40, name: fixedFixtureName(id), price: 150, duration: 60 };
  const state: RunState = { version: 1, run_id: fixedReceiptId(id), marker: fixture.name, pedido_id: 53, referencia_publica: "AHM-2026-0009", producto_id: fixture.id, line_count: 1, quote_price: fixture.price, quote_minutes: fixture.duration, expected_status: "CONFIRMADO" };
  const foreignOrder: ApiOrder = { id: state.pedido_id, referencia_publica: state.referencia_publica, estado: "PENDIENTE_CONFIRMACION", fecha_entrega_acordada: null, productos: [{ id: 1, descripcion_cliente: `Pedido tal cual: ${MARCA_E2E} foreign-fixed-fixture`, es_modificacion: false, precio_fijado_admin: null, tiempo_total_estimado_minutos: fixture.duration, imagenes: [] }] };
  expect(() => assertFixedOrderOwnership(foreignOrder, state, id, fixture)).toThrow("Fixed order ownership guard");
});

test.describe("Flujo real acotado comprador → admin", () => {
  test("comprador_crea pedido modificable, sube imagen y persiste su estado", async ({ page, request }) => {
    test.setTimeout(180_000);
    const id = runId();
    const file = stateFile(id);
    mkdirSync(dirname(file), { recursive: true });
    if (existsSync(file)) throw new Error("[E2E real] Run state exists; choose a new E2E_RUN_ID.");
    const producto = await findExistingModifiableProduct(request);
    const marker = `${MARCA_E2E} flujo ${id}`;
    const quotePrice = 237;
    const quoteMinutes = 60;
    await loginRole(page, "comprador");
    await page.goto(`/categoria/${SLUG_PINATAS}/producto/${producto.id}`);
    await expect(page.getByRole("heading", { name: producto.nombre })).toBeVisible();
    await page.getByRole("radio", { name: "Con una modificación" }).click();
    await page.getByLabel("Describe tu modificación *").fill(marker);
    await page.locator('input[type="file"]').first().setInputFiles(IMAGEN_FIXTURE);
    await expect(page.getByText("e2e-sample.png")).toBeVisible();
    await page.getByRole("button", { name: "Agregar a mi pedido" }).click();
    await expect(page).toHaveURL(/\/pedido$/);
    await llenarContacto(page, { nombre: `${MARCA_E2E} comprador ${id}`, telefono: "5500000000" });
    await clickContinuar(page);
    await llenarDireccion(page);
    await clickContinuar(page);
    await expect(page.getByRole("heading", { name: "Confirma tu solicitud" })).toBeVisible();

    let creationRequests = 0;
    page.on("request", (request) => { if (isPostPath(request, "/api/pedidos/solicitud-autenticada")) creationRequests += 1; });
    const creation = page.waitForResponse((response) => isPostPath(response.request(), "/api/pedidos/solicitud-autenticada"));
    const upload = page.waitForResponse((response) => response.request().method() === "POST" && /\/api\/pedidos\/\d+\/productos\/\d+\/imagenes$/.test(apiPath(response.url())));
    await Promise.all([creation, page.getByRole("button", { name: "Enviar solicitud" }).click()]);
    const created = await orderFromResponse(await creation, "Authenticated order creation");
    if (created.estado !== "COTIZANDO" || created.productos.length === 0 || created.productos.some((linea) => !linea.es_modificacion || linea.descripcion_cliente !== marker)) throw new Error("[E2E real] Creation did not produce the expected COTIZANDO modification lines.");
    writeRunState({ version: 1, run_id: id, marker, pedido_id: created.id, referencia_publica: created.referencia_publica, producto_id: producto.id, line_count: created.productos.length, quote_price: quotePrice, quote_minutes: quoteMinutes, expected_status: producto.requiere_anticipo ? "ESPERANDO_ANTICIPO" : "CONFIRMADO" });
    const uploadResponse = await upload;
    const uploaded = await json<unknown>(uploadResponse, "Modification image upload");
    const uploadPath = apiPath(uploadResponse.url());
    if (!Array.isArray(uploaded) || uploaded.length === 0 || !created.productos.some((linea) => uploadPath === `/api/pedidos/${created.id}/productos/${linea.id}/imagenes`)) throw new Error("[E2E real] Modification image upload did not persist the own order image.");
    if (creationRequests !== 1) throw new Error("[E2E real] Buyer phase submitted the order more than once.");
    await expect(page).toHaveURL(/\/pedido\/confirmacion\/[^/]+$/);
    await expect(page.getByText(created.referencia_publica, { exact: true })).toBeVisible();
    await expect(page.getByText("Como tu pedido incluye una modificación", { exact: false })).toBeVisible();
    await expect(page.getByText("Algunas fotos no se subieron.")).toHaveCount(0);
  });

  test("admin_cotiza pedido propio desde dialogo, fecha disponible y verifica persistencia", async ({ page, request }) => {
    test.setTimeout(180_000);
    const state = readRunState();
    await loginRole(page, "admin");
    const before = await getOrderWithSession(request, page, state.pedido_id);
    assertOwnPendingOrder(before, state);
    const lineIds = before.productos.map((linea) => linea.id);
    await page.goto(`/admin/orders/${state.pedido_id}`);
    await expect(page.getByText(state.referencia_publica, { exact: true })).toBeVisible();
    await expect(page.getByText(state.marker, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cotizar pedido" })).toBeVisible();
    await page.getByRole("button", { name: "Cotizar pedido" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Fija el precio (y tiempo opcional) de cada línea y la fecha de entrega.")).toBeVisible();
    const inputs = dialog.getByRole("spinbutton");
    await expect(inputs).toHaveCount(lineIds.length * 2);
    for (let index = 0; index < lineIds.length; index += 1) {
      await inputs.nth(index * 2).fill(String(state.quote_price));
      await inputs.nth(index * 2 + 1).fill(String(state.quote_minutes));
    }
    const date = await selectAvailableDate(page, dialog, request, state.quote_minutes * lineIds.length);
    const quote = page.waitForResponse((response) => isPostPath(response.request(), `/api/pedidos/${state.pedido_id}/cotizar`));
    await dialog.getByRole("button", { name: "Cotizar", exact: true }).click();
    const quoteResponse = await quote;
    let quoteBody: unknown;
    try { quoteBody = quoteResponse.request().postDataJSON(); } catch { throw new Error("[E2E real] Quote request body could not be read for dialog verification."); }
    if (!quoteResponse.ok() || !isRecord(quoteBody) || quoteBody.fecha_entrega_acordada !== date || !Array.isArray(quoteBody.lineas)) throw new Error("[E2E real] Quote request did not use the selected date and line payload.");
    const sentIds = quoteBody.lineas.map((linea) => (isRecord(linea) ? linea.producto_pedido_id : null));
    if (sentIds.length !== lineIds.length || new Set(sentIds).size !== lineIds.length || lineIds.some((id) => !sentIds.includes(id)) || quoteBody.lineas.some((linea) => !isRecord(linea) || linea.precio_fijado_admin !== state.quote_price || linea.tiempo_total_estimado_minutos !== state.quote_minutes)) throw new Error("[E2E real] Quote request did not include every line value from the sourced dialog.");
    const quoted = await orderFromResponse(quoteResponse, "Quote mutation");
    assertQuotedOrder(quoted, state, lineIds, date);
    assertQuotedOrder(await getOrderWithSession(request, page, state.pedido_id), state, lineIds, date);
    await expect(dialog).toBeHidden();
    await expect(page.getByText(statusLabel[state.expected_status], { exact: true })).toBeVisible();
  });

  test("admin_confirma", async ({ browser, request }) => {
    test.setTimeout(180_000);
    const id = runId();
    const fixedId = fixedReceiptId(id);
    const file = stateFile(fixedId);
    mkdirSync(dirname(file), { recursive: true });
    if (existsSync(file)) throw new Error("[E2E real] Fixed run state exists; choose a new E2E_RUN_ID; use admin_confirma_existente for a saved receipt.");
    const fixture = await loadFixedFixture(request, id);
    // The authenticated endpoint binds the existing client from OIDC; contact name is not ownership proof.
    const marker = `${MARCA_E2E} fijo ${id}`;
    const buyerContext = await browser.newContext();
    try {
      const buyerPage = await buyerContext.newPage();
      await loginRole(buyerPage, "comprador");
      await buyerPage.goto(`${E2E_APP_ORIGIN}/categoria/${SLUG_PINATAS}/producto/${fixture.id}`);
      await expect(buyerPage.getByRole("heading", { name: fixture.name })).toBeVisible();
      await buyerPage.getByRole("button", { name: "Agregar a mi pedido" }).click();
      await expect(buyerPage).toHaveURL(/\/pedido$/);
      await llenarContacto(buyerPage, { nombre: marker, telefono: "5500000000" });
      await clickContinuar(buyerPage);
      await llenarDireccion(buyerPage);
      await clickContinuar(buyerPage);
      const fecha = await elegirDiaDisponibleProximoMes(buyerPage, request);
      await clickContinuar(buyerPage);
      await expect(buyerPage.getByRole("heading", { name: "Resumen del pedido" })).toBeVisible();
      await expect(buyerPage.getByText("Total estimado", { exact: true })).toBeVisible();
      await clickContinuar(buyerPage);
      await expect(buyerPage.getByRole("heading", { name: "Confirma tu solicitud" })).toBeVisible();

      let creationRequests = 0;
      buyerPage.on("request", (request) => { if (isPostPath(request, "/api/pedidos/solicitud-autenticada")) creationRequests += 1; });
      const creation = buyerPage.waitForResponse((response) => isPostPath(response.request(), "/api/pedidos/solicitud-autenticada"));
      await buyerPage.getByRole("button", { name: "Enviar solicitud" }).click();
      const created = await orderFromResponse(await creation, "Fixed authenticated order creation");
      if (created.estado !== "PENDIENTE_CONFIRMACION" || created.productos.length !== 1 || created.productos.some((linea) => linea.es_modificacion || linea.precio_fijado_admin !== null || !positiveNumber(linea.tiempo_total_estimado_minutos))) throw new Error("[E2E real] Fixed creation did not produce one PENDIENTE_CONFIRMACION line with frozen positive minutes and null admin price.");
      const state: RunState = { version: 1, run_id: fixedId, marker, pedido_id: created.id, referencia_publica: created.referencia_publica, producto_id: fixture.id, line_count: created.productos.length, quote_price: fixture.price, quote_minutes: fixture.duration, expected_status: "CONFIRMADO" };
      writeRunState(state);
      assertFixedOrderOwnership(created, state, id, fixture);
      if (creationRequests !== 1) throw new Error("[E2E real] Fixed buyer phase submitted the order more than once.");

      await confirmFixedOrderAsAdmin(browser, request, state, id, fixture, fecha);
    } finally {
      await buyerContext.close();
    }
  });

  test("admin_confirma_existente", async ({ browser, request }) => {
    test.setTimeout(180_000);
    const id = runId();
    const state = readFixedRunState(id);
    const fixture = await loadFixedFixture(request, id, state.producto_id);
    await confirmFixedOrderAsAdmin(browser, request, state, id, fixture);
  });


});
