import { test, expect } from "@playwright/test";
import { installApiMocks, pedidoDetalleMock, solicitudMock } from "./helpers/mocks";

// ────────────────────────────────────────────────────────────────────────────
// E2E de la vista ADMIN del pedido (bandeja de solicitudes + detalle).
//
// Con `page.route` (mocks deterministas): verifica que el admin VE el pedido y
// que las ACCIONES correctas aparecen según el estado. No ejecuta confirmar /
// cotizar de punta a punta (eso mutaría más datos y se cubre en backend); basta
// con que la vista y sus controles rendericen correctamente por estado.
// ────────────────────────────────────────────────────────────────────────────

test.describe("Bandeja de solicitudes (/admin/solicitudes)", () => {
  test("lista los pedidos entrantes por estado con su referencia y contacto", async ({ page }) => {
    const cotizando = solicitudMock({
      id: 51,
      referencia_publica: "AHM-2026-0009",
      estado: "COTIZANDO",
      precio_final_total: null,
      cliente: { nombre: "Homero Simpson" },
      cliente_nombre: "Homero Simpson",
      productos: [
        {
          id: 200,
          descripcion_cliente: "Piñata con temática de dinosaurios verdes.",
          es_modificacion: true,
          precio_estimado_ia: null,
          precio_fijado_admin: null,
          tiempo_total_estimado_minutos: null,
          foto_referencia_url: null,
          imagenes: [],
          componentes: [],
        },
      ],
    });
    const pendiente = solicitudMock({
      id: 52,
      referencia_publica: "AHM-2026-0010",
      estado: "PENDIENTE_CONFIRMACION",
      cliente: { nombre: "Marge Bouvier" },
      cliente_nombre: "Marge Bouvier",
    });

    await installApiMocks(page, {
      orders: { COTIZANDO: [cotizando], PENDIENTE_CONFIRMACION: [pendiente] },
    });
    await page.goto("/admin/solicitudes");

    await expect(page.getByRole("heading", { name: "Solicitudes" })).toBeVisible();

    // Ambas solicitudes visibles, con referencia, estado (label) y cliente.
    await expect(page.getByText("AHM-2026-0009")).toBeVisible();
    await expect(page.getByText("AHM-2026-0010")).toBeVisible();
    await expect(page.getByText("Cotizando")).toBeVisible();
    await expect(page.getByText("Pendiente de confirmación")).toBeVisible();
    await expect(page.getByText("Homero Simpson")).toBeVisible();
    await expect(page.getByText("Marge Bouvier")).toBeVisible();

    // La modificación muestra su descripción; hay accesos a detalle y a Facebook.
    await expect(page.getByText("Modificación solicitada")).toBeVisible();
    await expect(page.getByText("Piñata con temática de dinosaurios verdes.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver detalle" }).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Contactar por Facebook" }).first(),
    ).toBeVisible();
  });

  test("sin solicitudes muestra el estado vacío", async ({ page }) => {
    await installApiMocks(page, { orders: { COTIZANDO: [], PENDIENTE_CONFIRMACION: [] } });
    await page.goto("/admin/solicitudes");

    await expect(page.getByText("No hay solicitudes pendientes.")).toBeVisible();
  });
});

test.describe("Detalle admin del pedido (/admin/orders/:id)", () => {
  test("un pedido PENDIENTE_CONFIRMACION ofrece 'Confirmar pedido'", async ({ page }) => {
    await installApiMocks(page, {
      pedidoDetalle: pedidoDetalleMock({
        estado: "PENDIENTE_CONFIRMACION",
        fecha_entrega_solicitada: "2026-08-15T00:00:00.000Z",
      }),
    });
    await page.goto("/admin/orders/42");

    await expect(page.getByText("AHM-2026-0007")).toBeVisible();
    await expect(page.getByText("Pendiente de confirmación")).toBeVisible();
    // Dirección de entrega presente.
    await expect(page.getByText("Av. Siempre Viva, 742, Springfield")).toBeVisible();
    // Sin fecha acordada aún → "Por confirmar".
    await expect(page.getByText("Por confirmar")).toBeVisible();

    // Acción correcta para el estado: Confirmar (no Cotizar).
    await expect(page.getByRole("button", { name: "Confirmar pedido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cotizar pedido" })).toHaveCount(0);

    // El diálogo de confirmación abre correctamente.
    await page.getByRole("button", { name: "Confirmar pedido" }).click();
    await expect(
      page.getByText(
        "Se re-valida la disponibilidad y el pedido pasa a esperar anticipo o queda confirmado.",
      ),
    ).toBeVisible();
  });

  test("un pedido COTIZANDO (modificación) ofrece 'Cotizar pedido'", async ({ page }) => {
    await installApiMocks(page, {
      pedidoDetalle: pedidoDetalleMock({
        estado: "COTIZANDO",
        precio_final_total: null,
        productos: [
          {
            id: 100,
            descripcion_cliente: "Quiero temática de dinosaurios en tonos verdes.",
            es_modificacion: true,
            precio_estimado_ia: null,
            precio_fijado_admin: null,
            tiempo_total_estimado_minutos: null,
            foto_referencia_url: null,
            imagenes: [{ id: 5, url: "/uploads/pedidos/5.jpg", alt: null, orden: 0 }],
            componentes: [],
          },
        ],
      }),
    });
    await page.goto("/admin/orders/42");

    await expect(page.getByText("AHM-2026-0007")).toBeVisible();
    await expect(page.getByText("Cotizando")).toBeVisible();
    await expect(page.getByText("Por cotizar")).toBeVisible();
    await expect(page.getByText("Quiero temática de dinosaurios en tonos verdes.")).toBeVisible();

    // Acción correcta para el estado: Cotizar (no Confirmar).
    await expect(page.getByRole("button", { name: "Cotizar pedido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar pedido" })).toHaveCount(0);

    await page.getByRole("button", { name: "Cotizar pedido" }).click();
    await expect(
      page.getByText("Fija el precio (y tiempo opcional) de cada línea y la fecha de entrega."),
    ).toBeVisible();
  });

  test("un pedido ya CONFIRMADO no ofrece acciones de bandeja", async ({ page }) => {
    await installApiMocks(page, {
      pedidoDetalle: pedidoDetalleMock({
        estado: "CONFIRMADO",
        fecha_entrega_acordada: "2026-08-20T00:00:00.000Z",
      }),
    });
    await page.goto("/admin/orders/42");

    await expect(page.getByText("Confirmado")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar pedido" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cotizar pedido" })).toHaveCount(0);
  });
});
