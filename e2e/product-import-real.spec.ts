import { readFile } from "node:fs/promises";
import { test, expect } from "./helpers/realTest";

const TEMPLATE_FILE_NAME = "catalogo-importacion-plantilla.xlsx";
const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

test.describe("Integración real — importación de catálogo (admin)", () => {
  test.slow();

  test("descarga la plantilla, previsualiza y confirma el mismo archivo", async ({ page }) => {
    await page.goto("/admin/products/import");
    await expect(page.getByRole("heading", { name: "Importar catálogo" })).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Descargar plantilla" }).click(),
    ]);

    expect(download.suggestedFilename()).toBe(TEMPLATE_FILE_NAME);
    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
    const templateBuffer = await readFile(downloadedPath!);
    expect(templateBuffer.subarray(0, 2).toString()).toBe("PK");

    await page.locator("#archivo-importacion").setInputFiles({
      name: TEMPLATE_FILE_NAME,
      mimeType: XLSX_MIME_TYPE,
      buffer: templateBuffer,
    });
    await expect(page.getByText(new RegExp(`^${TEMPLATE_FILE_NAME} ·`))).toBeVisible();

    await page.getByRole("button", { name: "Previsualizar" }).click();
    await expect(
      page.getByRole("heading", { name: "Resultado de la previsualización" }),
    ).toBeVisible();
    await expect(page.getByText("Archivo válido", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar importación" })).toBeEnabled();

    await page.getByRole("button", { name: "Confirmar importación" }).click();
    await expect(page.getByRole("status")).toContainText("Importación confirmada", {
      timeout: 60_000,
    });
  });

  test("muestra los errores del backend cuando el archivo no es un XLSX válido", async ({
    page,
  }) => {
    await page.goto("/admin/products/import");
    await expect(page.getByRole("heading", { name: "Importar catálogo" })).toBeVisible();

    await page.locator("#archivo-importacion").setInputFiles({
      name: "catalogo-invalido.xlsx",
      mimeType: XLSX_MIME_TYPE,
      buffer: Buffer.from("esto no es un libro XLSX", "utf8"),
    });
    await page.getByRole("button", { name: "Previsualizar" }).click();

    await expect(
      page.getByRole("heading", { name: "Resultado de la previsualización" }),
    ).toBeVisible();
    await expect(page.getByText("Hay errores que corregir", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: /Errores por fila/ })).toContainText(
      "El archivo XLSX no es válido",
    );
    await expect(page.getByRole("button", { name: "Confirmar importación" })).toBeDisabled();
  });
});
