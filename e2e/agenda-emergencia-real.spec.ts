import { expect, test } from "@playwright/test";
import {
  MARCA_E2E,
  assertEmergenciasAdminEnabled,
  crearPedidoConfirmadoE2E,
  esperarDetalleEmergencia,
  esperarEmergenciaPorMotivo,
  marcarContactadoEmergencia,
  obtenerDiaDisponibleFuturo,
  obtenerEmergenciaReal,
  obtenerSeguimientoPublico,
  retirarEmergenciaReal,
} from "./helpers/real";

// E2E REAL, sin mocks ni interceptores. Requisitos:
//   E2E_REAL=1; backend + DB en :3001 (o E2E_API_URL); backend con
//   EMERGENCIAS_ADMIN_ENABLED=true; frontend con VITE_VUE_APP_DOMAIN apuntando
//   al backend real. El webServer de Playwright mantiene la UI en :5173.
// Ejemplo: EMERGENCIAS_ADMIN_ENABLED=true E2E_REAL=1 bunx playwright test agenda-emergencia-real
const CORRER_REAL = process.env.E2E_REAL === "1";

const fechaVisible = (fecha: string): string =>
  new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${fecha}T00:00:00`));

test.describe("Integración real — agenda de emergencias", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !CORRER_REAL,
    "E2E real deshabilitado. Requiere E2E_REAL=1, backend/DB y frontend reales.",
  );
  test.slow();

  test("crea, consulta, marca contacto y sigue un pedido afectado", async ({
    page,
    request,
  }) => {
    let emergenciaId: number | undefined;
    let afectadoId: number | undefined;

    try {
      // Falla de forma explícita si el backend no tiene habilitado el guard admin.
      await assertEmergenciasAdminEnabled(request);
      const fecha = await obtenerDiaDisponibleFuturo(request);
      const pedido = await crearPedidoConfirmadoE2E(request, fecha);
      const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const motivo = `${MARCA_E2E} emergencia contacto ${runId}`;

      // La emergencia se crea por la UI real, no por API ni por un mock.
      await page.goto("/admin/agenda");
      await expect(page.getByRole("heading", { name: "Agenda y disponibilidad" })).toBeVisible();
      await page.getByLabel("Desde", { exact: true }).fill(fecha);
      await page.getByLabel("Hasta", { exact: true }).fill(fecha);
      await page.getByLabel("Motivo (opcional)", { exact: true }).fill(motivo);
      const crear = page.getByRole("button", { name: "Crear emergencia", exact: true });
      await expect(crear).toBeEnabled();
      await crear.click();

      const creada = await esperarEmergenciaPorMotivo(request, motivo);
      emergenciaId = creada.id;
      expect(creada).toMatchObject({ desde: fecha, hasta: fecha, motivo });
      const afectado = creada.afectados.find((item) => item.pedido_id === pedido.id);
      expect(afectado, `El pedido ${pedido.id} no quedó afectado por la emergencia.`).toBeTruthy();
      if (!afectado) throw new Error(`No se encontró el afectado del pedido ${pedido.id}.`);
      afectadoId = afectado.id;

      // Abre el enlace real de la lista, sin construir la ruta desde un id fijo.
      const fila = page.locator("li").filter({ hasText: motivo });
      await expect(fila).toBeVisible();
      const detalleLink = fila.getByRole("link");
      await expect(detalleLink).toHaveAttribute(
        "href",
        new RegExp(`/admin/agenda/emergencias/${emergenciaId}$`),
      );
      await detalleLink.click();
      await expect(page).toHaveURL(new RegExp(`/admin/agenda/emergencias/${emergenciaId}$`));

      await expect(page.getByRole("heading", { name: "Detalle de emergencia" })).toBeVisible();
      await expect(page.getByText(fechaVisible(fecha), { exact: false }).first()).toBeVisible();
      await expect(page.getByText(motivo, { exact: true })).toBeVisible();
      await expect(page.getByText(pedido.cliente_nombre, { exact: true })).toBeVisible();
      await expect(page.getByText(pedido.referencia_publica, { exact: true })).toBeVisible();

      const tarjeta = page.locator("article").filter({ hasText: pedido.referencia_publica });
      await expect(tarjeta).toBeVisible();
      const contactado = tarjeta.getByRole("checkbox", { name: "Contactado" });
      await expect(contactado).not.toBeChecked();
      await contactado.click();
      await expect(contactado).toBeChecked();

      // La UI pudo actualizarse optimistamente; esta lectura prueba el PATCH real.
      const persistida = await esperarDetalleEmergencia(request, emergenciaId, (detalle) =>
        detalle.afectados.some((item) => item.id === afectadoId && item.contactado),
      );
      const afectadoPersistido = persistida.afectados.find((item) => item.id === afectadoId);
      expect(afectadoPersistido).toMatchObject({
        pedido_id: pedido.id,
        referencia_publica: pedido.referencia_publica,
        contactado: true,
      });

      await tarjeta.getByRole("button", { name: "Resolver", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Resolver pedido", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Cancelar pedido", exact: true }).click();
      await expect(
        page.getByText("¿Confirmas la cancelación de este pedido?", { exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Confirmar cancelación", exact: true }).click();
      await expect(tarjeta.getByText("Cancelado", { exact: true }).last()).toBeVisible();

      await page.getByRole("button", { name: "Retirar emergencia", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Retirar emergencia", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Confirmar retirada", exact: true }).click();
      await expect(
        page.locator("section").first().getByText("Retirada", { exact: true }).first(),
      ).toBeVisible();

      const seguimiento = await obtenerSeguimientoPublico(
        request,
        pedido.seguimiento_token_publico,
      );
      expect(seguimiento).toMatchObject({
        referencia_publica: pedido.referencia_publica,
        estado: "CANCELADO",
        retrasado: false,
      });
      expect(seguimiento.fecha_entrega_solicitada?.slice(0, 10)).toBe(fecha);
      expect(seguimiento.fecha_entrega_acordada?.slice(0, 10)).toBe(fecha);

      await page.goto(`/pedido/seguimiento/${encodeURIComponent(pedido.seguimiento_token_publico)}`);
      await expect(page.getByRole("heading", { name: "Seguimiento de tu pedido" })).toBeVisible();
      await expect(page.getByText(pedido.referencia_publica, { exact: true })).toBeVisible();
      await expect(page.getByText("Cancelado", { exact: true })).toBeVisible();
      const fechas = page.locator("dl > div");
      await expect(fechas.nth(0)).toContainText(fechaVisible(fecha));
      await expect(fechas.nth(1)).toContainText(fechaVisible(fecha));
    } finally {
      // La limpieza no es una aserción del journey: solo evita dejar bloqueos activos.
      if (emergenciaId !== undefined) {
        const detalle = await obtenerEmergenciaReal(request, emergenciaId);
        const afectado = afectadoId
          ? detalle.afectados.find((item) => item.id === afectadoId)
          : undefined;
        if (afectado?.contactado && afectado.resolucion === null) {
          await marcarContactadoEmergencia(request, emergenciaId, afectado.id, false);
          await esperarDetalleEmergencia(
            request,
            emergenciaId,
            (actual) => !actual.afectados.some((item) => item.id === afectado.id && item.contactado),
          );
        }
        if (detalle.activo) {
          await retirarEmergenciaReal(request, emergenciaId);
        }
      }
    }
  });
});
