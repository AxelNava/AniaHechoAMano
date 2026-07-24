import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { CATEGORIA_PINATAS, MARCA_E2E } from "./helpers/real";
import {
  asegurarComponente,
  crearProductoConReceta,
  listarComponentes,
  obtenerComponente,
  obtenerProductoDetalle,
  type ComponenteApi,
  type ProductoDetalleApi,
} from "./helpers/productos";

// ────────────────────────────────────────────────────────────────────────────
// E2E de INTEGRACIÓN REAL del gestor "Componentes del producto" (receta) en
// /admin/products/edit/:id (front :5173 + backend :3001 + Neon). Igual que
// `productos-imagenes-real.spec.ts`: NADA de mocks, ESCRIBEN en la BD real,
// van desactivados por defecto y solo corren con `E2E_REAL=1`.
//
// ── Qué validan ─────────────────────────────────────────────────────────────
//   • La receta persistida (GET /api/productos/:id → `componentes`) tras cada
//     acción en la UI: cargar, añadir, cambiar cantidad, quitar, guardar sin
//     tocar (regresión del full-replace que borraba la receta).
//   • El modal de edición de componente en 2 pasos: "Crear copia para este
//     producto" (POST /componentes/new con nombre "<original> - copia para
//     <producto>") vs "Editar componente global" (PATCH /componentes/:id) vs
//     "Cancelar" (sin efectos). Todo con verificación cruzada UI ↔ API real.
//
// ── Estrategia de datos: ACUMULACIÓN `[E2E]` con runId ──────────────────────
//   El backend NO tiene DELETE de componentes ni de productos, así que nada se
//   borra. Los componentes base "[E2E] Componente receta A/B" son IDEMPOTENTES
//   (se reutilizan entre corridas y NUNCA se editan globalmente desde estos
//   tests). Todo lo demás lleva un runId (timestamp) en el nombre para no
//   chocar entre corridas: cada escenario siembra SU PROPIO producto
//   "[E2E] Producto receta <escenario> <runId>" (aislamiento total, los tests
//   pueden correr en paralelo), y las copias/el componente "global" dedicado
//   también son únicos por corrida. Correr con moderación: cada corrida
//   acumula ~9 productos y ~1-2 componentes nuevos en la BD real.
//
// ── Cómo levantarlos ────────────────────────────────────────────────────────
//   1. Backend NestJS en :3001 con la BD Neon.
//   2. Frontend :5173 (webServer de playwright.config.ts, reuseExistingServer).
//   3. Ejecuta:  E2E_REAL=1 bunx playwright test productos-componentes-real
// ────────────────────────────────────────────────────────────────────────────

const CORRER_REAL = process.env.E2E_REAL === "1";

const NOMBRE_COMPONENTE_A = `${MARCA_E2E} Componente receta A`;
const NOMBRE_COMPONENTE_B = `${MARCA_E2E} Componente receta B`;

/** Mismo formato que usa el front para nombrar la copia de un componente. */
const nombreCopia = (nombreOriginal: string, nombreProducto: string) =>
  `${nombreOriginal} - copia para ${nombreProducto}`;

/** Nombre único por escenario y corrida (no hay DELETE: evita colisiones). */
const nombreProductoReceta = (escenario: string, runId: number) =>
  `${MARCA_E2E} Producto receta ${escenario} ${runId}`;

// ── Localizadores del gestor (semánticos, según ProductComponentsManager) ────

/** La <section aria-label="Componentes del producto"> expone rol "region". */
const seccionReceta = (page: Page) =>
  page.getByRole("region", { name: "Componentes del producto" });

/** Select de la fila n (1-based): aria-label "Componente de la fila n". */
const selectFila = (page: Page, n: number) =>
  seccionReceta(page).getByLabel(`Componente de la fila ${n}`, { exact: true });

/** Input de cantidad de la fila (0-based): aria-label "Cantidad". */
const cantidadFila = (page: Page, index: number) =>
  seccionReceta(page).getByLabel("Cantidad").nth(index);

/** Abre el editor del producto y espera a que la receta tenga N filas. */
async function abrirEditorProducto(page: Page, id: number, filasEsperadas: number) {
  await page.goto(`/admin/products/edit/${id}`);
  await expect(page.getByRole("heading", { name: "Editar Producto" })).toBeVisible();
  await expect(seccionReceta(page)).toBeVisible();
  // Las filas solo se renderizan cuando el catálogo de componentes ya cargó.
  await expect(seccionReceta(page).getByLabel("Cantidad")).toHaveCount(filasEsperadas);
}

/** Guarda el producto y espera el toast de éxito real. */
async function guardarProducto(page: Page) {
  await page.getByRole("button", { name: "Guardar Cambios" }).click();
  await expect(page.getByText("Producto actualizado exitosamente")).toBeVisible();
}

/** Siembra por API los componentes base A y B (idempotente) y un producto nuevo. */
async function asegurarProductoConReceta(
  request: APIRequestContext,
  escenario: string,
  runId: number,
  receta: (componenteA: ComponenteApi, componenteB: ComponenteApi) => {
    componente_id: number;
    cantidad: number;
  }[],
): Promise<{ producto: ProductoDetalleApi; componenteA: ComponenteApi; componenteB: ComponenteApi }> {
  const componenteA = await asegurarComponente(request, NOMBRE_COMPONENTE_A, {
    unidad_medida: "pieza",
  });
  const componenteB = await asegurarComponente(request, NOMBRE_COMPONENTE_B, {
    unidad_medida: "metro",
  });
  const producto = await crearProductoConReceta(
    request,
    nombreProductoReceta(escenario, runId),
    receta(componenteA, componenteB),
    CATEGORIA_PINATAS,
  );
  return { producto, componenteA, componenteB };
}

test.describe("Integración real — receta de componentes del producto (admin)", () => {
  test.skip(
    !CORRER_REAL,
    "Integración real deshabilitada. Correr con E2E_REAL=1 y el stack (backend :3001 + Neon) levantado.",
  );

  // Siembra por API + varias lecturas/escrituras a la BD real: más margen.
  test.slow();

  test("carga la receta existente: la fila muestra el componente A seleccionado con cantidad 2", async ({
    page,
    request,
  }) => {
    const { producto, componenteA } = await asegurarProductoConReceta(
      request,
      "carga",
      Date.now(),
      (a) => [{ componente_id: a.id, cantidad: 2 }],
    );

    await abrirEditorProducto(page, producto.id, 1);

    // La fila referencia al componente A y la opción visible es "nombre (unidad)".
    await expect(selectFila(page, 1)).toHaveValue(String(componenteA.id));
    await expect(selectFila(page, 1).locator("option:checked")).toHaveText(
      `${componenteA.nombre} (${componenteA.unidad_medida})`,
    );
    await expect(cantidadFila(page, 0)).toHaveValue("2");
  });

  test("estado vacío: sin receta muestra el aviso y permite crearla desde cero", async ({
    page,
    request,
  }) => {
    const { producto, componenteA } = await asegurarProductoConReceta(
      request,
      "vacio",
      Date.now(),
      () => [],
    );
    expect(producto.componentes ?? []).toHaveLength(0);

    await abrirEditorProducto(page, producto.id, 0);
    await expect(seccionReceta(page).getByText("No hay componentes en la receta.")).toBeVisible();

    // Crea la primera fila: A con cantidad 2.
    await seccionReceta(page).getByRole("button", { name: "Añadir componente" }).click();
    await expect(selectFila(page, 1)).toHaveValue(""); // placeholder "Selecciona un componente"
    await selectFila(page, 1).selectOption(String(componenteA.id));
    await cantidadFila(page, 0).fill("2");
    await guardarProducto(page);

    const persistido = await obtenerProductoDetalle(request, producto.id);
    expect(persistido.componentes).toEqual([{ componente_id: componenteA.id, cantidad: 2 }]);
  });

  test("añade el componente B con cantidad decimal 1.5 y la receta persistida contiene ambos", async ({
    page,
    request,
  }) => {
    const { producto, componenteA, componenteB } = await asegurarProductoConReceta(
      request,
      "alta",
      Date.now(),
      (a) => [{ componente_id: a.id, cantidad: 2 }],
    );

    await abrirEditorProducto(page, producto.id, 1);

    // Nueva fila para B con cantidad decimal.
    await seccionReceta(page).getByRole("button", { name: "Añadir componente" }).click();
    await selectFila(page, 2).selectOption(String(componenteB.id));
    await cantidadFila(page, 1).fill("1.5");

    // Edge case: un componente ya usado queda deshabilitado en la OTRA fila.
    await expect(
      selectFila(page, 2).locator(`option[value="${componenteA.id}"]`),
    ).toBeDisabled();
    await expect(
      selectFila(page, 1).locator(`option[value="${componenteB.id}"]`),
    ).toBeDisabled();

    await guardarProducto(page);

    // Verificación cruzada: el backend persistió AMBOS, con la cantidad decimal.
    const persistido = await obtenerProductoDetalle(request, producto.id);
    expect(persistido.componentes).toEqual([
      { componente_id: componenteA.id, cantidad: 2 },
      { componente_id: componenteB.id, cantidad: 1.5 },
    ]);
  });

  test("cambia la cantidad de A a 3, persiste y la fila re-renderiza con 3", async ({
    page,
    request,
  }) => {
    const { producto, componenteA } = await asegurarProductoConReceta(
      request,
      "cantidad",
      Date.now(),
      (a) => [{ componente_id: a.id, cantidad: 2 }],
    );

    await abrirEditorProducto(page, producto.id, 1);
    await expect(cantidadFila(page, 0)).toHaveValue("2");

    await cantidadFila(page, 0).fill("3");
    await guardarProducto(page);

    // Tras guardar, la vista re-sincroniza con la respuesta real del backend:
    // la fila sigue mostrando 3 y el componente sigue siendo A.
    await expect(cantidadFila(page, 0)).toHaveValue("3");
    await expect(selectFila(page, 1)).toHaveValue(String(componenteA.id));

    const persistido = await obtenerProductoDetalle(request, producto.id);
    expect(persistido.componentes).toEqual([{ componente_id: componenteA.id, cantidad: 3 }]);
  });

  test("REGRESIÓN: guardar sin tocar los componentes no borra la receta (full-replace)", async ({
    page,
    request,
  }) => {
    const runId = Date.now();
    const { producto, componenteA, componenteB } = await asegurarProductoConReceta(
      request,
      "regresion",
      runId,
      (a, b) => [
        { componente_id: a.id, cantidad: 2 },
        { componente_id: b.id, cantidad: 1 },
      ],
    );

    await abrirEditorProducto(page, producto.id, 2);

    // Solo se toca la descripción; el gestor de componentes NO se toca.
    // (El label "Descripción" del formulario no está asociado por for/id, así
    // que se usa el mismo localizador que en productos-imagenes-real.spec.ts.)
    await page
      .locator("form textarea")
      .fill(`Producto E2E regresión receta. Guardado sin tocar componentes (${runId}). Ignorar.`);
    await guardarProducto(page);

    // El backend hace full-replace de la receta: si la vista no re-enviara la
    // receta completa, este GET la devolvería vacía (el bug antiguo).
    const persistido = await obtenerProductoDetalle(request, producto.id);
    expect(persistido.componentes).toEqual([
      { componente_id: componenteA.id, cantidad: 2 },
      { componente_id: componenteB.id, cantidad: 1 },
    ]);
  });

  test("quita el componente B y al guardar la receta persistida solo conserva A", async ({
    page,
    request,
  }) => {
    const { producto, componenteA, componenteB } = await asegurarProductoConReceta(
      request,
      "quitar",
      Date.now(),
      (a, b) => [
        { componente_id: a.id, cantidad: 2 },
        { componente_id: b.id, cantidad: 1 },
      ],
    );

    await abrirEditorProducto(page, producto.id, 2);
    await expect(selectFila(page, 2)).toHaveValue(String(componenteB.id));

    // Quita la SEGUNDA fila (B); queda solo la fila de A.
    await seccionReceta(page).getByRole("button", { name: "Quitar" }).nth(1).click();
    await expect(seccionReceta(page).getByLabel("Cantidad")).toHaveCount(1);
    await expect(selectFila(page, 1)).toHaveValue(String(componenteA.id));

    await guardarProducto(page);

    const persistido = await obtenerProductoDetalle(request, producto.id);
    expect(persistido.componentes).toEqual([{ componente_id: componenteA.id, cantidad: 2 }]);
  });

  test("COPIA: 'Crear copia para este producto' crea el componente copia y la receta pasa a referenciarlo", async ({
    page,
    request,
  }) => {
    const runId = Date.now();
    const { producto, componenteA } = await asegurarProductoConReceta(
      request,
      "copia",
      runId,
      (a) => [{ componente_id: a.id, cantidad: 2 }],
    );
    const unidadCopia = `lote-${runId}`;
    const nombreEsperadoCopia = nombreCopia(componenteA.nombre, producto.nombre);

    await abrirEditorProducto(page, producto.id, 1);

    // Paso 1 del modal: formulario precargado con los datos reales de A.
    await seccionReceta(page).getByRole("button", { name: "Editar" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByRole("heading", { name: "Editar componente" })).toBeVisible();
    await expect(dialogo.getByLabel("Nombre *")).toHaveValue(componenteA.nombre);

    await dialogo.getByLabel("Tipo de Medición (Unidad) *").fill(unidadCopia);
    await dialogo.getByRole("button", { name: "Continuar" }).click();

    // Paso 2: anuncia el nombre exacto que tendrá la copia.
    await expect(
      dialogo.getByRole("heading", { name: "¿Cómo aplicar los cambios?" }),
    ).toBeVisible();
    await expect(dialogo.getByText(nombreEsperadoCopia)).toBeVisible();

    await dialogo.getByRole("button", { name: "Crear copia para este producto" }).click();
    await expect(page.getByText("Copia del componente creada para este producto")).toBeVisible();
    await expect(dialogo).toBeHidden();

    // Verificación cruzada: la copia existe en el backend con el campo editado.
    const copia = (await listarComponentes(request)).find(
      (c) => c.nombre === nombreEsperadoCopia,
    );
    expect(copia, `No se creó el componente copia "${nombreEsperadoCopia}"`).toBeTruthy();
    expect(copia!.unidad_medida).toBe(unidadCopia);

    // El original NO se tocó y la fila pasó a referenciar el id de la copia.
    const originalDespues = await obtenerComponente(request, componenteA.id);
    expect(originalDespues.unidad_medida).toBe(componenteA.unidad_medida);
    await expect(selectFila(page, 1)).toHaveValue(String(copia!.id));
    await expect(selectFila(page, 1).locator("option:checked")).toHaveText(
      `${nombreEsperadoCopia} (${unidadCopia})`,
    );

    // Guardar persiste la receta apuntando a la COPIA (y ya no a A).
    await guardarProducto(page);
    const persistido = await obtenerProductoDetalle(request, producto.id);
    expect(persistido.componentes).toEqual([{ componente_id: copia!.id, cantidad: 2 }]);
  });

  test("GLOBAL: 'Editar componente global' modifica el componente original y la receta conserva su id", async ({
    page,
    request,
  }) => {
    const runId = Date.now();
    // Componente DEDICADO a esta corrida: editarlo globalmente no afecta a
    // los componentes base A/B reutilizados por el resto de escenarios.
    const componenteGlobal = await asegurarComponente(
      request,
      `${MARCA_E2E} Componente global ${runId}`,
      { unidad_medida: "pieza" },
    );
    const producto = await crearProductoConReceta(
      request,
      nombreProductoReceta("global", runId),
      [{ componente_id: componenteGlobal.id, cantidad: 4 }],
      CATEGORIA_PINATAS,
    );
    const unidadNueva = `global-${runId}`;

    await abrirEditorProducto(page, producto.id, 1);

    await seccionReceta(page).getByRole("button", { name: "Editar" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.getByLabel("Tipo de Medición (Unidad) *").fill(unidadNueva);
    await dialogo.getByRole("button", { name: "Continuar" }).click();

    await dialogo.getByRole("button", { name: "Editar componente global" }).click();
    await expect(
      page.getByText("Componente actualizado para todos los productos"),
    ).toBeVisible();
    await expect(dialogo).toBeHidden();

    // Verificación cruzada: el componente ORIGINAL quedó modificado (mismo id).
    const actualizado = await obtenerComponente(request, componenteGlobal.id);
    expect(actualizado.unidad_medida).toBe(unidadNueva);

    // La fila sigue referenciando el MISMO id (no se creó ninguna copia)...
    await expect(selectFila(page, 1)).toHaveValue(String(componenteGlobal.id));
    expect(
      (await listarComponentes(request)).some((c) =>
        c.nombre.startsWith(nombreCopia(componenteGlobal.nombre, "")),
      ),
    ).toBe(false);

    // ...y guardar conserva la receta con el id original y su cantidad.
    await guardarProducto(page);
    const persistido = await obtenerProductoDetalle(request, producto.id);
    expect(persistido.componentes).toEqual([
      { componente_id: componenteGlobal.id, cantidad: 4 },
    ]);
  });

  test("CANCELAR: cerrar el modal en cualquiera de los 2 pasos no cambia ni el componente ni la receta", async ({
    page,
    request,
  }) => {
    const runId = Date.now();
    const { producto, componenteA } = await asegurarProductoConReceta(
      request,
      "cancelar",
      runId,
      (a) => [{ componente_id: a.id, cantidad: 2 }],
    );
    const antes = await obtenerComponente(request, componenteA.id);

    await abrirEditorProducto(page, producto.id, 1);
    const dialogo = page.getByRole("dialog");

    // 1) Cancela en el PASO 1 (formulario), tras editar un campo.
    await seccionReceta(page).getByRole("button", { name: "Editar" }).click();
    await dialogo.getByLabel("Tipo de Medición (Unidad) *").fill(`descartado-${runId}`);
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();

    // Reabrir muestra de nuevo los datos ORIGINALES (nada quedó a medias).
    await seccionReceta(page).getByRole("button", { name: "Editar" }).click();
    await expect(dialogo.getByLabel("Tipo de Medición (Unidad) *")).toHaveValue(
      antes.unidad_medida,
    );

    // 2) Cancela en el PASO 2 (confirmación).
    await dialogo.getByLabel("Tipo de Medición (Unidad) *").fill(`descartado-2-${runId}`);
    await dialogo.getByRole("button", { name: "Continuar" }).click();
    await expect(
      dialogo.getByRole("heading", { name: "¿Cómo aplicar los cambios?" }),
    ).toBeVisible();
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();

    // Verificación cruzada: el componente NO cambió y NO se creó ninguna copia.
    const despues = await obtenerComponente(request, componenteA.id);
    expect(despues).toEqual(antes);
    const copiaFantasma = (await listarComponentes(request)).find(
      (c) => c.nombre === nombreCopia(componenteA.nombre, producto.nombre),
    );
    expect(copiaFantasma).toBeUndefined();

    // La fila sigue apuntando a A y la receta persistida está intacta.
    await expect(selectFila(page, 1)).toHaveValue(String(componenteA.id));
    const persistido = await obtenerProductoDetalle(request, producto.id);
    expect(persistido.componentes).toEqual([{ componente_id: componenteA.id, cantidad: 2 }]);
  });
});
