import { type Page, expect } from "@playwright/test";

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
export async function llenarDireccion(page: Page, { maps = true } = {}): Promise<void> {
  await expect(page.getByRole("heading", { name: "¿Dónde entregamos?" })).toBeVisible();
  await page.getByLabel("Calle").fill("Av. Siempre Viva");
  await page.getByLabel("Número / casa").fill("742");
  if (maps) {
    await page.getByLabel("Enlace de Google Maps").fill("https://maps.google.com/?q=ania");
  }
}

export const clickContinuar = (page: Page) =>
  page.getByRole("button", { name: "Continuar" }).click();
