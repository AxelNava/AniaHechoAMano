import { test, expect } from "@playwright/test";
import {
  installApiMocks,
  irADetalle,
  agregarTalCual,
  agregarModificacion,
  llenarContacto,
  llenarDireccion,
  clickContinuar,
  seleccionarDia15ProximoMes,
  dia15ProximoMesISO,
  problemDetails,
  pngFake,
} from "./helpers/mocks";

// ────────────────────────────────────────────────────────────────────────────
// E2E del FLUJO PÚBLICO de pedido (cliente final).
//
// TODO se ejecuta con `page.route` (mocks deterministas): NO toca el backend ni
// Neon. Verifica funcionalidad observable: navegación, avance del wizard,
// mensajes (toasts/validaciones/banners) con su TEXTO LITERAL, ramas de negocio
// (fija vs modificación), soft-gate de Maps, disponibilidad y errores
// (ProblemDetails.detail). Nada de diseño.
// ────────────────────────────────────────────────────────────────────────────

test.describe("Catálogo → detalle", () => {
  test("desde el catálogo, la tarjeta del producto lleva a su detalle", async ({ page }) => {
    await installApiMocks(page);
    await page.goto("/categoria/postres");

    // La tarjeta enlaza con /categoria/:slug/producto/:id (ProductCard url-target).
    await page.getByRole("link", { name: "Piñata de Estrella" }).click();

    await expect(page).toHaveURL(/\/categoria\/postres\/producto\/1$/);
    await expect(page.getByRole("heading", { name: "Piñata de Estrella" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar a mi pedido" })).toBeVisible();
  });
});

test.describe("Detalle del producto", () => {
  test("un producto que NO permite modificaciones solo ofrece 'tal cual'", async ({ page }) => {
    await installApiMocks(page, { permiteModificaciones: false });
    await irADetalle(page);

    await expect(page.getByText("¿Cómo lo quieres?")).toHaveCount(0);
    await expect(page.getByText("Con una modificación")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Agregar a mi pedido" })).toBeVisible();
  });

  test("un producto modificable muestra el selector de modo", async ({ page }) => {
    await installApiMocks(page, { permiteModificaciones: true });
    await irADetalle(page);

    await expect(page.getByRole("heading", { name: "¿Cómo lo quieres?" })).toBeVisible();
    await expect(page.getByText("Tal cual", { exact: true })).toBeVisible();
    await expect(page.getByText("Con una modificación", { exact: true })).toBeVisible();
  });

  test("un producto con requiere_anticipo avisa del anticipo", async ({ page }) => {
    await installApiMocks(page, { requiereAnticipo: true });
    await irADetalle(page);

    await expect(
      page.getByText(
        "Este producto requiere un anticipo para agendarse. Te indicaremos el monto al confirmar tu pedido.",
      ),
    ).toBeVisible();
  });

  test("rechaza continuar si la modificación no tiene descripción y muestra el aviso", async ({
    page,
  }) => {
    await installApiMocks(page);
    await irADetalle(page);

    await page.getByText("Con una modificación", { exact: true }).click();
    // Textarea vacía → clic en Agregar a mi pedido dispara el toast de error y NO navega.
    await page.getByRole("button", { name: "Agregar a mi pedido" }).click();

    await expect(
      page.getByText("Describe la modificación que quieres para poder cotizarla."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/categoria\/pinatas\/producto\/1$/);
  });
});

test.describe("Detalle del producto — información y estados", () => {
  test("aclara el precio base y el siguiente paso antes de enviar la solicitud", async ({
    page,
  }) => {
    await installApiMocks(page);
    await page.goto("/categoria/pinatas/producto/1");

    await expect(page.getByText("Precio base", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "Agregarlo a tu pedido no envía la solicitud; podrás revisarla antes de enviarla.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar a mi pedido" })).toBeVisible();
  });

  test("el selector de modo tiene un nombre y radios con estado seleccionado", async ({
    page,
  }) => {
    await installApiMocks(page);
    await page.goto("/categoria/pinatas/producto/1");

    const opciones = page.getByRole("radiogroup", { name: "¿Cómo lo quieres?" });
    const talCual = opciones.getByRole("radio", { name: /Tal cual/ });
    const modificacion = opciones.getByRole("radio", { name: /Con una modificación/ });

    await expect(talCual).toBeChecked();
    await expect(modificacion).not.toBeChecked();

    await modificacion.click();

    await expect(modificacion).toBeChecked();
    await expect(talCual).not.toBeChecked();
  });

  test("explica que una modificación se cotiza antes de confirmar el pedido", async ({ page }) => {
    await installApiMocks(page);
    await page.goto("/categoria/pinatas/producto/1");

    await page.getByRole("radio", { name: /Con una modificación/ }).click();

    await expect(
      page.getByText(
        "El precio base es una referencia. Te enviaremos una cotización antes de confirmar tu pedido.",
      ),
    ).toBeVisible();
  });

  test("la galería anuncia la imagen actual y sus miniaturas", async ({ page }) => {
    await installApiMocks(page, {
      productos: {
        1: {
          imagenes: [
            {
              id: 11,
              url: "/uploads/productos/pinata-estrella-frontal.jpg",
              alt: "Piñata de estrella, vista frontal",
              orden: 0,
              es_portada: true,
            },
            {
              id: 12,
              url: "/uploads/productos/pinata-estrella-lateral.jpg",
              alt: "Piñata de estrella, vista lateral",
              orden: 1,
            },
          ],
        },
      },
    });
    await page.goto("/categoria/pinatas/producto/1");

    const galeria = page.getByRole("region", {
      name: "Galería de imágenes de Piñata de Estrella",
    });
    const miniaturaFrontal = galeria.getByRole("button", {
      name: "Ver imagen: Piñata de estrella, vista frontal",
    });
    const miniaturaLateral = galeria.getByRole("button", {
      name: "Ver imagen: Piñata de estrella, vista lateral",
    });

    await expect(
      galeria.getByRole("img", { name: "Piñata de estrella, vista frontal" }),
    ).toBeVisible();
    await expect(miniaturaFrontal).toHaveAttribute("aria-current", "true");

    await miniaturaLateral.click();

    await expect(
      galeria.getByRole("img", { name: "Piñata de estrella, vista lateral" }),
    ).toBeVisible();
    await expect(miniaturaLateral).toHaveAttribute("aria-current", "true");
    await expect(miniaturaFrontal).not.toHaveAttribute("aria-current", "true");
  });

  const esperarDetalleNoAccionable = async (page: import("@playwright/test").Page) => {
    await expect(page.getByRole("heading", { name: "Producto no disponible" })).toBeVisible();
    await expect(
      page.getByText("No podemos agregar este producto a tu pedido en este momento."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver al catálogo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar a mi pedido" })).toHaveCount(0);
  };

  test("un producto inactivo no permite iniciar un pedido y ofrece una salida", async ({ page }) => {
    await installApiMocks(page, { productos: { 1: { activo: false } } });
    await page.goto("/categoria/pinatas/producto/1");

    await esperarDetalleNoAccionable(page);
  });

  test("la falta de información para pedido deja el detalle sin acción", async ({ page }) => {
    await installApiMocks(page, { sinInfoPedido: true });
    await page.goto("/categoria/pinatas/producto/1");

    await esperarDetalleNoAccionable(page);
  });

  test("un payload de producto inválido deja una salida recuperable", async ({ page }) => {
    await installApiMocks(page, {
      respuestaDetalleProducto: { id: "id-invalido" },
    });
    await page.goto("/categoria/pinatas/producto/1");

    await esperarDetalleNoAccionable(page);
  });

  test("un payload de información de pedido inválido deja una salida recuperable", async ({
    page,
  }) => {
    await installApiMocks(page, {
      respuestaInfoPedido: { id: "id-invalido" },
    });
    await page.goto("/categoria/pinatas/producto/1");

    await esperarDetalleNoAccionable(page);
  });
});

test.describe("Wizard — carrito y navegación", () => {
  test("el wizard vacío invita a ir al catálogo", async ({ page }) => {
    await installApiMocks(page);
    await page.goto("/pedido");

    await expect(page.getByRole("heading", { name: "Tu pedido está vacío" })).toBeVisible();
    await expect(page.getByText("Elige un producto del catálogo para empezar.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ir al catálogo" })).toBeVisible();
  });

  test("'Agregar otro producto' conserva el carrito", async ({ page }) => {
    await installApiMocks(page);
    await irADetalle(page, 1);
    await agregarTalCual(page);

    // "+ Agregar otro producto" navega a la home conservando el carrito persistido.
    await page.getByRole("button", { name: "+ Agregar otro producto" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/pedido");
    // Sigue habiendo pedido: aparece el primer paso, no el estado vacío.
    await expect(page.getByRole("heading", { name: "Tu pedido está vacío" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "¿Cómo te contactamos?" })).toBeVisible();
  });
});

test.describe("Wizard — validaciones de pasos", () => {
  test("Contacto exige el nombre", async ({ page }) => {
    await installApiMocks(page);
    await irADetalle(page);
    await agregarTalCual(page);

    await clickContinuar(page);

    await expect(page.getByText("Necesitamos tu nombre para el pedido.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "¿Cómo te contactamos?" })).toBeVisible();
  });

  test("Contacto exige al menos un medio de contacto", async ({ page }) => {
    await installApiMocks(page);
    await irADetalle(page);
    await agregarTalCual(page);

    await page.getByLabel("Nombre *").fill("Marge Bouvier");
    // Sin teléfono ni perfil de red social.
    await clickContinuar(page);

    await expect(
      page.getByText(
        "Déjanos al menos un medio de contacto: un teléfono o tu perfil/usuario de red social.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "¿Cómo te contactamos?" })).toBeVisible();
  });
});

test.describe("Wizard — soft-gate de Google Maps", () => {
  test("la 1ª vez sin Maps avisa; la 2ª vez continúa", async ({ page }) => {
    await installApiMocks(page);
    await irADetalle(page);
    await agregarTalCual(page);

    await llenarContacto(page);
    await clickContinuar(page);

    // Dirección SIN enlace de Maps.
    await llenarDireccion(page, { maps: false });

    // 1er intento: no avanza, muestra el aviso (banner) y sigue en Dirección.
    // El aviso se muestra a la vez como banner (<p>) y como toast (ambos válidos);
    // acotamos al banner del formulario para evitar el strict-mode con el toast.
    await clickContinuar(page);
    await expect(
      page.locator("p", {
        hasText:
          "Sin el enlace de Google Maps nos costará más ubicar la entrega. Si no lo tienes a mano, vuelve a presionar Continuar para omitirlo.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "¿Dónde entregamos?" })).toBeVisible();

    // 2º intento: omite Maps y avanza a Fecha.
    await clickContinuar(page);
    await expect(page.getByRole("heading", { name: "¿Para cuándo la quieres?" })).toBeVisible();
  });
});

test.describe("Wizard — Fecha y disponibilidad", () => {
  test("Fecha exige elegir un día antes de continuar", async ({ page }) => {
    await installApiMocks(page);
    await irADetalle(page);
    await agregarTalCual(page);
    await llenarContacto(page);
    await clickContinuar(page);
    await llenarDireccion(page);
    await clickContinuar(page);

    await expect(page.getByRole("heading", { name: "¿Para cuándo la quieres?" })).toBeVisible();
    await clickContinuar(page);

    await expect(page.getByText("Elige una fecha disponible en el calendario.")).toBeVisible();
  });

  test("un día bloqueado en la agenda aparece deshabilitado", async ({ page }) => {
    const bloqueado = dia15ProximoMesISO();
    await installApiMocks(page, { diasBloqueados: [bloqueado] });
    await irADetalle(page);
    await agregarTalCual(page);
    await llenarContacto(page);
    await clickContinuar(page);
    await llenarDireccion(page);
    await clickContinuar(page);

    await page.getByRole("button", { name: "Mes siguiente" }).click();
    await expect(page.getByRole("button", { name: bloqueado, exact: true })).toBeDisabled();
  });

  test("si la fecha se rechaza al evaluar, muestra motivos y sugerencias", async ({ page }) => {
    await installApiMocks(page, {
      // El día está disponible en el calendario, pero 'evaluar' lo rechaza
      // (se llenó entre la carga del mes y la selección).
      evaluar: {
        disponible: false,
        motivos: ["Ese día ya está lleno."],
        sugerencias: [],
      },
    });
    await irADetalle(page);
    await agregarTalCual(page);
    await llenarContacto(page);
    await clickContinuar(page);
    await llenarDireccion(page);
    await clickContinuar(page);

    await seleccionarDia15ProximoMes(page);

    await expect(page.getByText("Ese día ya no está disponible.")).toBeVisible();
    await expect(page.getByText("Ese día ya está lleno.")).toBeVisible();
  });

  test("al seleccionar un día disponible confirma la disponibilidad", async ({ page }) => {
    await installApiMocks(page);
    await irADetalle(page);
    await agregarTalCual(page);
    await llenarContacto(page);
    await clickContinuar(page);
    await llenarDireccion(page);
    await clickContinuar(page);

    await seleccionarDia15ProximoMes(page);
    await expect(page.getByText("¡Disponible! Continúa para revisar el resumen.")).toBeVisible();
  });
});

test.describe("Happy path — pedido FIJO (tal cual) → confirmación", () => {
  test("catálogo→detalle→wizard→confirmación con referencia_publica", async ({ page }) => {
    await installApiMocks(page);
    await irADetalle(page, 1);
    await agregarTalCual(page);

    // Contacto
    await llenarContacto(page);
    await clickContinuar(page);
    // Dirección (con Maps, sin soft-gate)
    await llenarDireccion(page);
    await clickContinuar(page);
    // Fecha
    await seleccionarDia15ProximoMes(page);
    await clickContinuar(page);
    // Resumen (solo en pedidos fijos)
    await expect(page.getByRole("heading", { name: "Resumen del pedido" })).toBeVisible();
    await expect(page.getByText("Total estimado")).toBeVisible();
    await clickContinuar(page);
    // Confirmar
    await expect(page.getByRole("heading", { name: "Confirma tu solicitud" })).toBeVisible();
    await page.getByRole("button", { name: "Enviar solicitud" }).click();

    // Confirmación: referencia visible + rama de pedido FIJO (no modificación).
    await expect(page).toHaveURL(/\/pedido\/confirmacion\/AHM-2026-0007$/);
    await expect(page.getByRole("heading", { name: "¡Solicitud recibida!" })).toBeVisible();
    await expect(page.getByText("AHM-2026-0007")).toBeVisible();
    await expect(
      page.getByText("Revisaremos tu solicitud y te confirmaremos la fecha", { exact: false }),
    ).toBeVisible();
    // No es modificación → NO aparece el enlace de Facebook.
    await expect(page.getByRole("link", { name: "Contactar por Facebook" })).toHaveCount(0);
  });
});

test.describe("Happy path — pedido con MODIFICACIÓN → COTIZANDO → Facebook", () => {
  test("modificación oculta Fecha/Precio y la confirmación enlaza a Facebook", async ({ page }) => {
    await installApiMocks(page);
    await irADetalle(page, 1);
    await agregarModificacion(page, "Quiero que sea temática de dinosaurios, en tonos verdes.");

    // Contacto → Dirección → (SIN Fecha/Resumen) → Confirmar
    await llenarContacto(page);
    await clickContinuar(page);
    await llenarDireccion(page);
    await clickContinuar(page);

    // Salta directo a Confirmar: los pasos Fecha/Resumen no existen.
    await expect(page.getByRole("heading", { name: "Confirma tu solicitud" })).toBeVisible();
    await expect(page.getByText("¿Para cuándo la quieres?")).toHaveCount(0);
    await expect(page.getByText("Resumen del pedido")).toHaveCount(0);
    await expect(page.getByText("quedará", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Enviar solicitud" }).click();

    // Confirmación: referencia + rama de modificación con enlace a Facebook.
    // exact:true acota al <p> de la referencia (el mensaje sugerido de Facebook
    // también contiene la referencia embebida en su texto).
    await expect(page).toHaveURL(/\/pedido\/confirmacion\/AHM-2026-0007$/);
    await expect(page.getByText("AHM-2026-0007", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Como tu pedido incluye una modificación", { exact: false }),
    ).toBeVisible();
    const fb = page.getByRole("link", { name: "Contactar por Facebook" });
    await expect(fb).toBeVisible();
    await expect(fb).toHaveAttribute("href", /m\.me\/AniaHechoAMano\?ref=AHM-2026-0007/);
  });

  test("con foto de referencia, la subida de fase 2 completa el envío", async ({ page }) => {
    await installApiMocks(page);
    await irADetalle(page, 1);

    // Adjunta una foto de referencia (queda en memoria; se sube en fase 2).
    await page.getByText("Con una modificación", { exact: true }).click();
    await page.getByLabel("Describe tu modificación *").fill("Con foto de ejemplo.");
    await page.locator('input[type="file"]').first().setInputFiles(pngFake);
    await page.getByRole("button", { name: "Agregar a mi pedido" }).click();
    await expect(page).toHaveURL(/\/pedido$/);

    await llenarContacto(page);
    await clickContinuar(page);
    await llenarDireccion(page);
    await clickContinuar(page);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();

    await expect(page).toHaveURL(/\/pedido\/confirmacion\/AHM-2026-0007$/);
    // Fase 2 OK → NO aparece el aviso de fotos pendientes.
    await expect(page.getByText("Algunas fotos no se subieron.")).toHaveCount(0);
  });

  test("si la subida de fotos falla, el pedido queda creado con aviso de re-subida", async ({
    page,
  }) => {
    await installApiMocks(page, { imagenesStatus: 500 });
    await irADetalle(page, 1);

    await page.getByText("Con una modificación", { exact: true }).click();
    await page.getByLabel("Describe tu modificación *").fill("Con foto que fallará.");
    await page.locator('input[type="file"]').first().setInputFiles(pngFake);
    await page.getByRole("button", { name: "Agregar a mi pedido" }).click();
    await expect(page).toHaveURL(/\/pedido$/);

    await llenarContacto(page);
    await clickContinuar(page);
    await llenarDireccion(page);
    await clickContinuar(page);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();

    // El pedido igual se crea (fase 1 OK); la confirmación avisa de las fotos.
    await expect(page).toHaveURL(/\/pedido\/confirmacion\/AHM-2026-0007$/);
    await expect(
      page.getByText("Algunas fotos no se subieron. Envíalas al contactarnos por Facebook."),
    ).toBeVisible();
  });
});

test.describe("Pedido MIXTO (fija + modificación)", () => {
  test("con una línea de modificación el pedido completo se cotiza (sin Fecha/Precio)", async ({
    page,
  }) => {
    await installApiMocks(page);

    // Línea 1: producto 1 tal cual.
    await irADetalle(page, 1);
    await agregarTalCual(page);

    // Línea 2: producto 2 como modificación (el carrito persiste entre navegaciones).
    await irADetalle(page, 2);
    await agregarModificacion(page, "Cambiar los colores del segundo producto.");

    await llenarContacto(page);
    await clickContinuar(page);
    await llenarDireccion(page);
    await clickContinuar(page);

    // Al haber ≥1 modificación, el wizard oculta Fecha y Resumen → va a Confirmar.
    await expect(page.getByRole("heading", { name: "Confirma tu solicitud" })).toBeVisible();
    await expect(page.getByText("¿Para cuándo la quieres?")).toHaveCount(0);
    await expect(page.getByText("2 producto(s)")).toBeVisible();

    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page).toHaveURL(/\/pedido\/confirmacion\/AHM-2026-0007$/);
    await expect(
      page.getByText("Como tu pedido incluye una modificación", { exact: false }),
    ).toBeVisible();
  });
});

test.describe("Errores del backend al enviar (ProblemDetails)", () => {
  // Reutiliza el flujo corto de modificación para llegar a "Enviar solicitud".
  const llegarAEnviar = async (page: import("@playwright/test").Page) => {
    await irADetalle(page, 1);
    await agregarModificacion(page, "Descripción de la modificación.");
    await llenarContacto(page);
    await clickContinuar(page);
    await llenarDireccion(page);
    await clickContinuar(page);
    await expect(page.getByRole("heading", { name: "Confirma tu solicitud" })).toBeVisible();
  };

  test("400 de validación muestra el detail y deja reintentar", async ({ page }) => {
    await installApiMocks(page, {
      solicitud: (route) =>
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify(problemDetails(400, "La fecha solicitada ya no está disponible.", "VALIDATION_ERROR")),
        }),
    });
    await llegarAEnviar(page);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();

    await expect(page.getByText("La fecha solicitada ya no está disponible.")).toBeVisible();
    // UI recuperable: sigue en el wizard, no navega a la confirmación.
    await expect(page).toHaveURL(/\/pedido$/);
    await expect(page.getByRole("button", { name: "Enviar solicitud" })).toBeVisible();
  });

  test("409 de conflicto muestra el detail", async ({ page }) => {
    await installApiMocks(page, {
      solicitud: (route) =>
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify(problemDetails(409, "Ya existe un registro con estos datos", "CONFLICT")),
        }),
    });
    await llegarAEnviar(page);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();

    await expect(page.getByText("Ya existe un registro con estos datos")).toBeVisible();
    await expect(page).toHaveURL(/\/pedido$/);
  });

  test("500 del servidor muestra el detail", async ({ page }) => {
    await installApiMocks(page, {
      solicitud: (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify(problemDetails(500, "Error de base de datos: conexión perdida", "DATABASE_ERROR")),
        }),
    });
    await llegarAEnviar(page);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();

    await expect(page.getByText("Error de base de datos: conexión perdida")).toBeVisible();
    await expect(page).toHaveURL(/\/pedido$/);
  });

  test("red caída no navega y deja el wizard recuperable", async ({ page }) => {
    await installApiMocks(page, { solicitud: (route) => route.abort("failed") });
    await llegarAEnviar(page);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();

    // No se puede asertar el texto exacto del error de red (depende del navegador),
    // pero SÍ que la UI queda coherente: no navega y permite reintentar.
    await expect(page).toHaveURL(/\/pedido$/);
    await expect(page.getByRole("heading", { name: "Confirma tu solicitud" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar solicitud" })).toBeVisible();
  });
});
