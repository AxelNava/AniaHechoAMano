import { test, expect } from "@playwright/test";
import { llenarContacto, llenarDireccion, clickContinuar } from "./helpers/mocks";
import {
  MARCA_E2E,
  SLUG_PINATAS,
  IMAGEN_FIXTURE,
  descubrirProductoTalCual,
  asegurarProductoModificable,
  elegirDiaDisponibleProximoMes,
  type ProductoApi,
} from "./helpers/real";

// ────────────────────────────────────────────────────────────────────────────
// E2E de INTEGRACIÓN REAL del proceso de pedidos (front + backend :3001 + Neon).
//
// A diferencia de `pedidos-publico.spec.ts` / `pedidos-admin.spec.ts` (que usan
// `page.route` y NO tocan la red), estos tests golpean el backend real y
// ESCRIBEN en la BD Neon compartida. Por eso van DESACTIVADOS por defecto y solo
// corren con `E2E_REAL=1`.
//
// ── Cómo levantarlos ────────────────────────────────────────────────────────
//   1. Backend NestJS en :3001 con la BD Neon (ya arriba).
//   2. Frontend en :5173 lo levanta el `webServer` de playwright.config.ts
//      (`bun run dev`), con `VITE_VUE_APP_DOMAIN=http://localhost:3001`.
//   3. Ejecuta:  E2E_REAL=1 bunx playwright test pedidos-integracion-real
//
// ── Estrategia de datos: ACUMULACIÓN `[E2E]` ────────────────────────────────
//   Cada corrida CREA pedidos reales (y, la 1ª vez, un producto modificable).
//   TODO lo creado se marca con el prefijo `[E2E]` (cliente, descripción,
//   producto). NO se borra nada (el backend no tiene endpoint de borrado). El
//   producto modificable se REUTILIZA entre corridas (no se recrea) para no
//   acumular productos en el catálogo. Correr con pocas iteraciones.
//
//   Los datos reales se DESCUBREN por API (no se asume id=1):
//   ver `helpers/real.ts`. Overrides: E2E_PRODUCTO_ID, E2E_PRODUCTO_MOD_ID,
//   E2E_SLUG, E2E_API_URL.
// ────────────────────────────────────────────────────────────────────────────

const CORRER_REAL = process.env.E2E_REAL === "1";

test.describe("Integración real — registro de pedidos y visibilidad admin", () => {
  test.skip(
    !CORRER_REAL,
    "Integración real deshabilitada. Correr con E2E_REAL=1 y el stack (backend :3001 + Neon) levantado.",
  );

  // Los flujos reales tocan red + Neon en varios pasos: dan más margen que un
  // test mockeado.
  test.slow();

  test("registra un pedido TAL CUAL y queda visible en la bandeja admin con acción de confirmar", async ({
    page,
    request,
  }) => {
    const producto: ProductoApi = await descubrirProductoTalCual(request);
    const runId = Date.now();
    const nombreCliente = `${MARCA_E2E} Cliente tal cual ${runId}`;

    // 1) Catálogo real → card del producto → detalle (navegación end-to-end).
    await page.goto(`/categoria/${SLUG_PINATAS}`);
    await page.getByRole("link", { name: producto.nombre }).click();
    await expect(page).toHaveURL(new RegExp(`/producto/${producto.id}$`));
    await expect(page.getByRole("heading", { name: producto.nombre })).toBeVisible();

    // 2) "Tal cual": no hay modificación → agrega al carrito y va al wizard.
    await page.getByRole("button", { name: "Solicitar" }).click();
    await expect(page).toHaveURL(/\/pedido$/);

    // 3) Contacto → Dirección → Fecha real → Resumen → Confirmar.
    await llenarContacto(page, { nombre: nombreCliente, telefono: "5500000000" });
    await clickContinuar(page);
    await llenarDireccion(page);
    await clickContinuar(page);

    await elegirDiaDisponibleProximoMes(page, request);
    await clickContinuar(page);

    await expect(page.getByRole("heading", { name: "Resumen del pedido" })).toBeVisible();
    await expect(page.getByText("Total estimado")).toBeVisible();
    await clickContinuar(page);

    await expect(page.getByRole("heading", { name: "Confirma tu solicitud" })).toBeVisible();
    await page.getByRole("button", { name: "Enviar solicitud" }).click();

    // 4) Confirmación con la referencia_publica REAL generada por el backend.
    await expect(page).toHaveURL(/\/pedido\/confirmacion\/AHM-\d{4}-\d+$/);
    await expect(page.getByRole("heading", { name: "¡Solicitud recibida!" })).toBeVisible();
    const referencia = decodeURIComponent(page.url().split("/pedido/confirmacion/")[1] ?? "");
    expect(referencia).toMatch(/^AHM-\d{4}-\d+/);
    await expect(page.getByText(referencia, { exact: true })).toBeVisible();

    // Rama de pedido FIJO: mensaje de "confirmaremos la fecha", SIN Facebook.
    await expect(
      page.getByText("Revisaremos tu solicitud y te confirmaremos la fecha", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Contactar por Facebook" })).toHaveCount(0);

    // 5) El admin lo ve en la bandeja (PENDIENTE_CONFIRMACION) por su referencia.
    await page.goto("/admin/solicitudes");
    await expect(page.getByRole("heading", { name: "Solicitudes" })).toBeVisible();

    const tarjeta = page.locator("article").filter({ hasText: referencia });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.getByText("Pendiente de confirmación")).toBeVisible();
    await expect(tarjeta.getByText(nombreCliente)).toBeVisible();

    // 6) Detalle admin: contacto, dirección, referencia y la acción del estado.
    await tarjeta.getByRole("link", { name: "Ver detalle" }).click();
    await expect(page).toHaveURL(/\/admin\/orders\/\d+$/);

    await expect(page.getByText(referencia).first()).toBeVisible();
    await expect(page.getByText(nombreCliente)).toBeVisible();
    await expect(page.getByText("Av. Siempre Viva, 742", { exact: false })).toBeVisible();
    // Acción correcta para PENDIENTE_CONFIRMACION: Confirmar (no Cotizar).
    await expect(page.getByRole("button", { name: "Confirmar pedido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cotizar pedido" })).toHaveCount(0);
  });

  test("registra un pedido con MODIFICACIÓN y foto real; queda COTIZANDO, enlaza a Facebook y la foto llega al detalle admin", async ({
    page,
    request,
  }) => {
    const producto = await asegurarProductoModificable(request);
    const runId = Date.now();
    const nombreCliente = `${MARCA_E2E} Cliente modificación ${runId}`;
    const descripcionMod = `${MARCA_E2E} Modificación de prueba ${runId}: tonos verdes, ignorar.`;

    // 1) Catálogo real → card → detalle del producto modificable.
    await page.goto(`/categoria/${SLUG_PINATAS}`);
    await page.getByRole("link", { name: producto.nombre }).click();
    await expect(page).toHaveURL(new RegExp(`/producto/${producto.id}$`));

    // 2) Modo modificación: describe + adjunta una imagen fixture REAL.
    await expect(page.getByRole("heading", { name: "¿Cómo lo quieres?" })).toBeVisible();
    await page.getByText("Con una modificación", { exact: true }).click();
    await page.getByLabel("Describe tu modificación *").fill(descripcionMod);
    await page.locator('input[type="file"]').first().setInputFiles(IMAGEN_FIXTURE);
    // La foto quedó adjunta en el gestor (preview con el nombre del archivo).
    await expect(page.getByText("e2e-sample.png")).toBeVisible();

    await page.getByRole("button", { name: "Solicitar" }).click();
    await expect(page).toHaveURL(/\/pedido$/);

    // 3) Contacto → Dirección → (SIN Fecha/Resumen) → Confirmar.
    await llenarContacto(page, { nombre: nombreCliente, telefono: "5500000000" });
    await clickContinuar(page);
    await llenarDireccion(page);
    await clickContinuar(page);

    await expect(page.getByRole("heading", { name: "Confirma tu solicitud" })).toBeVisible();
    await expect(page.getByText("¿Para cuándo la quieres?")).toHaveCount(0);
    await expect(page.getByText("Resumen del pedido")).toHaveCount(0);

    await page.getByRole("button", { name: "Enviar solicitud" }).click();

    // 4) Confirmación: referencia real + rama COTIZANDO con enlace a Facebook.
    await expect(page).toHaveURL(/\/pedido\/confirmacion\/AHM-\d{4}-\d+$/);
    const referencia = decodeURIComponent(page.url().split("/pedido/confirmacion/")[1] ?? "");
    expect(referencia).toMatch(/^AHM-\d{4}-\d+/);
    await expect(page.getByText(referencia, { exact: true })).toBeVisible();
    await expect(
      page.getByText("Como tu pedido incluye una modificación", { exact: false }),
    ).toBeVisible();
    const fb = page.getByRole("link", { name: "Contactar por Facebook" });
    await expect(fb).toBeVisible();
    await expect(fb).toHaveAttribute("href", /facebook\.com\/AniaHechoAMano/);

    // La subida de fotos (fase 2) completó: NO aparece el aviso de re-subida.
    await expect(page.getByText("Algunas fotos no se subieron.")).toHaveCount(0);

    // 5) El admin lo ve en la bandeja (COTIZANDO), con la descripción y la foto.
    await page.goto("/admin/solicitudes");
    await expect(page.getByRole("heading", { name: "Solicitudes" })).toBeVisible();

    const tarjeta = page.locator("article").filter({ hasText: referencia });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.getByText("Cotizando")).toBeVisible();
    await expect(tarjeta.getByText(descripcionMod)).toBeVisible();

    // 6) Detalle admin: modificación (badge + descripción), foto real subida,
    //    contacto/dirección/referencia y la acción del estado (Cotizar).
    await tarjeta.getByRole("link", { name: "Ver detalle" }).click();
    await expect(page).toHaveURL(/\/admin\/orders\/\d+$/);

    await expect(page.getByText(referencia).first()).toBeVisible();
    await expect(page.getByText(nombreCliente)).toBeVisible();
    await expect(page.getByText("Modificación", { exact: true })).toBeVisible();
    await expect(page.getByText(descripcionMod)).toBeVisible();
    // La foto de referencia subida en fase 2 aparece como miniatura.
    await expect(
      page.getByRole("img", { name: "Referencia de la modificación" }).first(),
    ).toBeVisible();
    // Acción correcta para COTIZANDO: Cotizar (no Confirmar).
    await expect(page.getByRole("button", { name: "Cotizar pedido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar pedido" })).toHaveCount(0);
  });
});
