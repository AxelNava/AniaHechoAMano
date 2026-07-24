import { test, expect } from "@playwright/test";
import { CATEGORIA_PINATAS } from "./helpers/real";
import {
  fotosDePrueba,
  nombreArchivo,
  nombreProductoE2E,
  agregarFotoYAnotar,
  cambiarFotoSinAnotar,
  contarFotos,
  buscarProductoPorNombre,
  obtenerProductoDetalle,
  asegurarProductoEditableConFoto,
} from "./helpers/productos";

// ────────────────────────────────────────────────────────────────────────────
// E2E de INTEGRACIÓN REAL: CREAR y EDITAR productos CON imágenes desde el panel
// admin (front :5173 + backend :3001 + Neon). Igual que `pedidos-integracion-
// real.spec.ts`, ESCRIBEN en la BD real, así que van DESACTIVADOS por defecto y
// solo corren con `E2E_REAL=1`. Todo lo creado se marca con `[E2E]`.
//
// ── Qué validan ─────────────────────────────────────────────────────────────
//   Las FOTOS de prueba se leen de `e2e/fixtures/productos/` (pega ahí las
//   tuyas; ver su README). La regla es:
//     • cada foto que se AGREGA se anota en la descripción como
//       `Foto agregada: <archivo> (<runId>)`  → eso es lo que se valida.
//     • cada foto que se CAMBIA/reemplaza NO se anota (por diseño).
//   Así comprobamos de forma determinista que la foto se incorporó, leyendo la
//   descripción persistida por el backend (sin depender del binario).
//
// ── Cómo levantarlos ────────────────────────────────────────────────────────
//   1. Backend NestJS en :3001 con la BD Neon.
//   2. Frontend :5173 lo levanta el `webServer` de playwright.config.ts,
//      con `VITE_VUE_APP_DOMAIN=http://localhost:3001`.
//   3. Pega tus fotos en `e2e/fixtures/productos/` (o usa las semilla).
//   4. Ejecuta:  E2E_REAL=1 bunx playwright test productos-imagenes-real
//
//   Overrides: E2E_PRODUCTO_EDIT_ID (producto a editar), E2E_API_URL, E2E_SLUG.
// ────────────────────────────────────────────────────────────────────────────

const CORRER_REAL = process.env.E2E_REAL === "1";

test.describe("Integración real — productos con imágenes (crear y editar)", () => {
  test.skip(
    !CORRER_REAL,
    "Integración real deshabilitada. Correr con E2E_REAL=1 y el stack (backend :3001 + Neon) levantado.",
  );

  // Subidas multipart + varias lecturas a la BD real: dan más margen.
  test.slow();

  test("CREAR: agrega varias fotos y cada una queda anotada en la descripción", async ({
    page,
    request,
  }) => {
    const [fotoA, fotoB] = fotosDePrueba(2);
    const runId = Date.now();
    const nombre = nombreProductoE2E(runId);

    // 1) Formulario de alta.
    await page.goto("/admin/products/new");
    await expect(page.getByRole("heading", { name: "Crear nuevo producto" })).toBeVisible();

    await page.getByPlaceholder("Nombre del producto").fill(nombre);
    await page.getByPlaceholder("0.00").fill("199");
    await page.locator("form select").first().selectOption({ label: CATEGORIA_PINATAS });

    const descripcion = page.getByPlaceholder("Descripción del producto");
    await descripcion.fill("Producto E2E de alta con fotos. Ignorar.");

    // 2) Agrega dos fotos; CADA agregado se anota en la descripción.
    const notaA = await agregarFotoYAnotar(page, descripcion, fotoA, runId);
    const notaB = await agregarFotoYAnotar(page, descripcion, fotoB, runId);
    expect(await contarFotos(page)).toBe(2);

    // La descripción, antes de guardar, ya refleja ambas anotaciones.
    const valorDescripcion = await descripcion.inputValue();
    expect(valorDescripcion).toContain(notaA);
    expect(valorDescripcion).toContain(notaB);

    // 3) Guarda y confirma el toast de éxito.
    await page.getByRole("button", { name: "Crear producto" }).click();
    await expect(page.getByText("Producto creado exitosamente")).toBeVisible();

    // 4) Validación por API: el producto real trae las 2 imágenes y su
    //    descripción contiene la anotación de cada foto agregada.
    const detalle = await buscarProductoPorNombre(request, nombre);
    expect(detalle.imagenes?.length ?? 0).toBe(2);
    expect(detalle.descripcion ?? "").toContain(notaA);
    expect(detalle.descripcion ?? "").toContain(notaB);
  });

  test("EDITAR: agregar una foto SÍ se anota; cambiar una existente NO se anota", async ({
    page,
    request,
  }) => {
    const [fotoAgregar, fotoReemplazo] = fotosDePrueba(2);
    const runId = Date.now();

    // 0) Producto editable reutilizable que YA trae al menos una foto.
    const inicial = await asegurarProductoEditableConFoto(request, CATEGORIA_PINATAS);
    const fotosIniciales = inicial.imagenes?.length ?? 0;
    expect(fotosIniciales).toBeGreaterThan(0);
    const descInicial = inicial.descripcion ?? "";

    // 1) Abre el editor; las imágenes existentes ya están cargadas.
    await page.goto(`/admin/products/edit/${inicial.id}`);
    await expect(page.getByRole("heading", { name: "Editar Producto" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar Cambios" })).toBeVisible();
    await expect.poll(() => contarFotos(page)).toBe(fotosIniciales);

    const descripcion = page.locator("form textarea");

    // 2) AGREGA una foto nueva → se anota en la descripción.
    const notaAgregada = await agregarFotoYAnotar(page, descripcion, fotoAgregar, runId);
    expect(await contarFotos(page)).toBe(fotosIniciales + 1);

    // 3) CAMBIA una foto EXISTENTE (la primera) → NO se anota nada.
    await cambiarFotoSinAnotar(page, 0, fotoReemplazo);
    expect(await contarFotos(page)).toBe(fotosIniciales + 1);

    // 4) Guarda y confirma el toast de éxito.
    await page.getByRole("button", { name: "Guardar Cambios" }).click();
    await expect(page.getByText("Producto actualizado exitosamente")).toBeVisible();

    // 5) Validación por API sobre el producto real:
    const detalle = await obtenerProductoDetalle(request, inicial.id);

    //    a) sigue habiendo exactamente 1 foto más que al inicio (cambiar no suma).
    expect(detalle.imagenes?.length ?? 0).toBe(fotosIniciales + 1);

    //    b) la foto AGREGADA quedó anotada por ESTA corrida (no estaba antes).
    expect(descInicial).not.toContain(notaAgregada);
    expect(detalle.descripcion ?? "").toContain(notaAgregada);

    //    c) la foto CAMBIADA no se anotó: su nombre no aparece como "Foto agregada".
    expect(detalle.descripcion ?? "").not.toContain(
      `Foto agregada: ${nombreArchivo(fotoReemplazo)}`,
    );
  });
});
