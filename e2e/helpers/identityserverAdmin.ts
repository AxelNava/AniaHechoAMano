import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const IDENTITYSERVER_AUTHORITY = "https://localhost:44310";
export const IDENTITYSERVER_ADMIN_CREDENTIALS_ENV = "E2E_IDENTITYSERVER_ADMIN_CREDENTIALS_FILE";

const INVALID_CREDENTIALS_MESSAGE =
  "[E2E IdentityServer] El archivo externo de credenciales falta o no es válido.";
const UNSAFE_NAVIGATION_MESSAGE =
  "[E2E IdentityServer] La navegación del panel no se pudo corroborar de forma segura.";
const LOGIN_FAILURE_MESSAGE =
  "[E2E IdentityServer] El inicio de sesión del panel no se pudo verificar de forma segura.";
const LOGIN_FAILURE_CODES = {
  navigation: "navigation",
  expected_STS: "expected_STS",
  form: "form",
  submit_return: "submit_return",
  session_check: "session_check",
} as const;
type LoginFailureStage = keyof typeof LOGIN_FAILURE_CODES;

const loginFailure = (stage: LoginFailureStage): Error =>
  new Error(`${LOGIN_FAILURE_MESSAGE} Código: ${LOGIN_FAILURE_CODES[stage]}.`);

export interface IdentityServerAdminExpectedConfiguration {
  readonly publicClientId: string;
  readonly apiResourceName: string;
  readonly apiScopeName: string;
  readonly apiResourceClaims: readonly string[];
  readonly apiScopeClaims: readonly string[];
}

export interface IdentityServerAdminCredentials {
  readonly version: 1;
  readonly panelUrl: string;
  readonly username: string;
  readonly password: string;
  readonly expected: IdentityServerAdminExpectedConfiguration;
}

export type IdentityServerAdminSection = "clients" | "apiResources" | "apiScopes";

export interface PublicClientInspection {
  readonly clientId: string;
  readonly requireClientSecret: boolean;
  readonly requirePkce: boolean;
  readonly allowPlainTextPkce: boolean;
  readonly allowedScopes: readonly string[];
}

export interface ApiResourceInspection {
  readonly name: string;
  readonly claims: Readonly<Record<string, boolean>>;
}

export interface ApiScopeInspection {
  readonly name: string;
  readonly claims: Readonly<Record<string, boolean>>;
}

export class UnverifiedConfigurationError extends Error {
  public constructor(area: string) {
    super(`${UNSAFE_NAVIGATION_MESSAGE} Área no verificable: ${area}.`);
    this.name = "UnverifiedConfigurationError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const failInvalidCredentials = (): never => {
  throw new Error(INVALID_CREDENTIALS_MESSAGE);
};

const normalizedUiText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const isPlaceholder = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return (
    /^<?replace_with_[a-z0-9_]+>?$/.test(normalized) ||
    /^(change-?me|placeholder|\.\.\.|your[-_](username|password))$/.test(normalized)
  );
};

const requireSafeText = (value: unknown, allowPlaceholder = false): string => {
  if (typeof value !== "string" || !value.trim() || /[\r\n]/.test(value) || value.includes("\0")) {
    return failInvalidCredentials();
  }
  if (!allowPlaceholder && isPlaceholder(value)) return failInvalidCredentials();
  return value;
};

const requireExpectedText = (value: unknown): string => requireSafeText(value).trim();

const rejectUnknownFields = (value: Record<string, unknown>, allowed: readonly string[]): void => {
  if (Object.keys(value).some((key) => !allowed.includes(key))) failInvalidCredentials();
};

const parsePanelUrl = (value: unknown): string => {
  const raw = requireSafeText(value, true).trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return failInvalidCredentials();
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return failInvalidCredentials();
  }
  return url.toString();
};

const parseClaimNames = (value: unknown): readonly string[] => {
  if (!Array.isArray(value)) return failInvalidCredentials();
  const claims = value.map((claim) => requireExpectedText(claim));
  const normalizedClaims = claims.map(normalizedUiText);
  if (
    normalizedClaims.some((claim) => !claim) ||
    new Set(normalizedClaims).size !== normalizedClaims.length
  ) {
    return failInvalidCredentials();
  }
  return Object.freeze(claims);
};

/** Parses the external document without including supplied values in failures. */
export function parseIdentityServerAdminCredentials(
  document: unknown,
): IdentityServerAdminCredentials {
  const root = isRecord(document) ? document : failInvalidCredentials();
  rejectUnknownFields(root, ["version", "panelUrl", "username", "password", "expected"]);
  if (root.version !== 1) failInvalidCredentials();

  const expected = isRecord(root.expected) ? root.expected : failInvalidCredentials();
  rejectUnknownFields(expected, [
    "publicClientId",
    "apiResourceName",
    "apiScopeName",
    "apiResourceClaims",
    "apiScopeClaims",
  ]);

  return Object.freeze({
    version: 1,
    panelUrl: parsePanelUrl(root.panelUrl),
    username: requireSafeText(root.username),
    password: requireSafeText(root.password),
    expected: Object.freeze({
      publicClientId: requireExpectedText(expected.publicClientId),
      apiResourceName: requireExpectedText(expected.apiResourceName),
      apiScopeName: requireExpectedText(expected.apiScopeName),
      apiResourceClaims: parseClaimNames(expected.apiResourceClaims),
      apiScopeClaims: parseClaimNames(expected.apiScopeClaims),
    }),
  });
}

export function resolveIdentityServerAdminCredentialsFile(): string {
  const configured = process.env[IDENTITYSERVER_ADMIN_CREDENTIALS_ENV];
  if (typeof configured !== "string" || !configured.trim() || /[\r\n]/.test(configured) || configured.includes("\0")) {
    return failInvalidCredentials();
  }
  return resolve(configured.trim());
}

/** Loads only the validated external document; file paths and secrets are never echoed. */
export function loadIdentityServerAdminCredentials(): IdentityServerAdminCredentials {
  const file = resolveIdentityServerAdminCredentialsFile();
  let source: string;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    return failInvalidCredentials();
  }

  let document: unknown;
  try {
    document = JSON.parse(source);
  } catch {
    return failInvalidCredentials();
  }
  return parseIdentityServerAdminCredentials(document);
}

const sectionSearch = {
  clients: {
    needles: ["clients", "client", "clientes", "cliente"],
    forbidden: ["scope", "scopes", "resource", "resources", "claim", "user", "role"],
  },
  apiResources: {
    needles: ["apiresources", "apiresource", "resources", "resource", "recursosapi", "recursoapi"],
    forbidden: ["client", "clients", "scope", "scopes", "claim"],
  },
  apiScopes: {
    needles: [
      "apiscopes",
      "apiscope",
      "scopes",
      "scope",
      "alcancesapi",
      "alcanceapi",
      "ambitosapi",
      "ambitoapi",
    ],
    forbidden: ["client", "clients", "resource", "resources", "claim"],
  },
} as const satisfies Record<
  IdentityServerAdminSection,
  { needles: readonly string[]; forbidden: readonly string[] }
>;

interface DiscoveredLink {
  readonly index: number;
  readonly href: string;
}

const discoverSectionLink = async (
  page: Page,
  section: IdentityServerAdminSection,
): Promise<DiscoveredLink> => {
  const search = sectionSearch[section];
  const link = await page.locator("a[href]").evaluateAll((elements, criteria) => {
    const normalize = (value: string): string =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
    const needles = criteria.needles.map(normalize);
    const forbidden = criteria.forbidden.map(normalize);
    let best: { index: number; href: string; score: number } | undefined;

    elements.forEach((element, index) => {
      if (!(element instanceof HTMLAnchorElement) || !element.getClientRects().length) return;
      if (element.target && element.target !== "_self") return;
      const href = element.href;
      if (!href || href.startsWith("javascript:") || href.startsWith("mailto:")) return;

      const text = normalize(
        [
          element.textContent ?? "",
          element.getAttribute("aria-label") ?? "",
          element.getAttribute("title") ?? "",
          element.getAttribute("href") ?? "",
        ].join(" "),
      );
      if (forbidden.some((term) => text.includes(term))) return;

      const score = needles.reduce((current, term) => {
        if (!text.includes(term)) return current;
        return current + (text.includes(term) && term.length > 5 ? 3 : 1);
      }, 0);
      if (score === 0 || (best && score <= best.score)) return;
      best = { index, href, score };
    });

    return best ? { index: best.index, href: best.href } : null;
  }, search);

  if (!link) throw new UnverifiedConfigurationError(section);
  return link;
};

const navigateToDiscoveredLink = async (
  page: Page,
  panelUrl: string,
  link: Pick<DiscoveredLink, "href">,
  area: string,
): Promise<void> => {
  const panelOrigin = new URL(panelUrl).origin;
  let destination: URL;
  try {
    destination = new URL(link.href, page.url());
  } catch {
    throw new UnverifiedConfigurationError(area);
  }
  if (
    destination.origin !== panelOrigin ||
    destination.username ||
    destination.password ||
    !["http:", "https:"].includes(destination.protocol)
  ) {
    throw new UnverifiedConfigurationError(area);
  }

  try {
    await page.goto(destination.toString(), { waitUntil: "domcontentloaded" });
  } catch {
    throw new UnverifiedConfigurationError(area);
  }
  if (new URL(page.url()).origin !== panelOrigin) {
    throw new UnverifiedConfigurationError(area);
  }
};

/** Follows a visible panel link discovered in the rendered navigation; no route is invented. */
export async function navigateToAdminSection(
  page: Page,
  credentials: IdentityServerAdminCredentials,
  section: IdentityServerAdminSection,
): Promise<void> {
  try {
    await page.goto(credentials.panelUrl, { waitUntil: "domcontentloaded" });
  } catch {
    throw new UnverifiedConfigurationError(section);
  }
  if (new URL(page.url()).origin !== new URL(credentials.panelUrl).origin) {
    throw new UnverifiedConfigurationError(section);
  }
  const link = await discoverSectionLink(page, section);
  await navigateToDiscoveredLink(page, credentials.panelUrl, link, section);
}

interface RowLink {
  readonly href: string;
  readonly score: number;
}

const discoverReadOnlyRowLink = async (
  row: import("@playwright/test").Locator,
): Promise<RowLink> => {
  const link = await row.locator("a[href]").evaluateAll((elements) => {
    const preferred = [
      "edit",
      "editar",
      "view",
      "ver",
      "detail",
      "details",
      "detalle",
      "detalles",
      "configur",
    ];
    const forbidden = ["delete", "remove", "eliminar", "erase", "add", "create", "new", "crear"];
    let best: RowLink | undefined;

    elements.forEach((element) => {
      if (!(element instanceof HTMLAnchorElement) || !element.getClientRects().length) return;
      if (element.target && element.target !== "_self") return;
      const href = element.href;
      if (!href || href.startsWith("javascript:") || href.startsWith("mailto:")) return;
      const description = [
        element.textContent ?? "",
        element.getAttribute("aria-label") ?? "",
        element.getAttribute("title") ?? "",
        element.getAttribute("href") ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (forbidden.some((term) => description.includes(term))) return;
      const score = preferred.reduce(
        (current, term) => current + (description.includes(term) ? 2 : 0),
        0,
      );
      if (score === 0 || (best && score <= best.score)) return;
      best = { href, score };
    });

    return best ?? null;
  });

  if (!link) throw new UnverifiedConfigurationError("detalle de entidad");
  return link;
};

const openEntityDetails = async (page: Page, identifier: string, area: string): Promise<void> => {
  const identifierText = page.getByText(identifier, { exact: true }).first();
  if (
    (await identifierText.count()) !== 1 ||
    !(await identifierText.isVisible().catch(() => false))
  ) {
    throw new UnverifiedConfigurationError(area);
  }

  const row = identifierText.locator("xpath=ancestor::*[self::tr or @role='row'][1]");
  if ((await row.count()) !== 1) throw new UnverifiedConfigurationError(area);
  const link = await discoverReadOnlyRowLink(row);
  await navigateToDiscoveredLink(page, new URL(page.url()).toString(), link, area);
};

interface ControlSnapshot {
  readonly kind: "checkbox" | "select" | "text";
  readonly score: number;
  readonly checked?: boolean;
  readonly value?: string;
  readonly label?: string;
  readonly selected?: readonly string[];
}

const controlMatches = async (
  page: Page,
  aliases: readonly string[],
): Promise<readonly ControlSnapshot[]> => {
  const normalizedAliases = aliases.map(normalizedUiText);
  return page.locator("input, select, textarea").evaluateAll((elements, wanted) => {
    const normalize = (value: string): string =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
    const result: ControlSnapshot[] = [];

    const scoreFor = (identifiers: readonly string[]): number =>
      identifiers.reduce((best, identifier) => {
        const normalized = normalize(identifier);
        return wanted.reduce((current, alias) => {
          if (normalized === alias) return Math.max(current, 3);
          if (normalized.includes(alias)) return Math.max(current, 1);
          return current;
        }, best);
      }, 0);

    elements.forEach((element) => {
      if (
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        )
      ) {
        return;
      }
      if (!element.getClientRects().length) return;
      const inputType = element instanceof HTMLInputElement ? element.type.toLowerCase() : "";
      if (["hidden", "password", "file", "submit", "button", "reset"].includes(inputType)) return;

      const parentLabel = element.closest("label")?.textContent ?? "";
      const associatedLabels = element.labels
        ? Array.from(element.labels).map((label) => label.textContent ?? "")
        : [];
      const label = [...associatedLabels, parentLabel].join(" ").trim();
      const score = scoreFor([
        element.id,
        element.getAttribute("name") ?? "",
        element.getAttribute("aria-label") ?? "",
        label,
      ]);
      if (score === 0) return;

      if (element instanceof HTMLInputElement && inputType === "checkbox") {
        result.push({
          kind: "checkbox",
          score,
          checked: element.checked,
          value: element.value,
          label,
        });
        return;
      }
      if (element instanceof HTMLSelectElement) {
        const selected = Array.from(element.selectedOptions).flatMap((option) => [
          option.value,
          option.textContent ?? "",
        ]);
        result.push({ kind: "select", score, selected });
        return;
      }
      result.push({
        kind: "text",
        score,
        value: element.value,
        label,
      });
    });

    return result;
  }, normalizedAliases);
};

const selectSingleControl = (
  controls: readonly ControlSnapshot[],
  kind: ControlSnapshot["kind"],
  area: string,
): ControlSnapshot => {
  const matching = controls.filter((control) => control.kind === kind);
  if (!matching.length) throw new UnverifiedConfigurationError(area);
  const bestScore = Math.max(...matching.map((control) => control.score));
  const best = matching.filter((control) => control.score === bestScore);
  if (best.length !== 1) throw new UnverifiedConfigurationError(area);
  return best[0]!;
};

const readTextControl = async (
  page: Page,
  aliases: readonly string[],
  area: string,
): Promise<string> => {
  const control = selectSingleControl(await controlMatches(page, aliases), "text", area);
  if (typeof control.value !== "string" || !control.value.trim()) {
    throw new UnverifiedConfigurationError(area);
  }
  return control.value.trim();
};

const readBooleanControl = async (
  page: Page,
  aliases: readonly string[],
  area: string,
): Promise<boolean> => {
  const control = selectSingleControl(await controlMatches(page, aliases), "checkbox", area);
  return control.checked === true;
};

const readAllowedScopes = async (page: Page, area: string): Promise<readonly string[]> => {
  const controls = await controlMatches(page, [
    "allowedscopes",
    "selectedscopes",
    "apiscope",
    "apiscopes",
    "scopes",
    "alcancesapi",
    "ambitosapi",
  ]);
  if (!controls.length) throw new UnverifiedConfigurationError(area);

  const values = controls.flatMap((control) => {
    if (control.kind === "checkbox") {
      return control.checked ? [control.value ?? "", control.label ?? ""] : [];
    }
    if (control.kind === "select") return control.selected ?? [];
    return [];
  });
  if (!values.some((value) => value.trim())) throw new UnverifiedConfigurationError(area);
  return Object.freeze(values.filter((value) => value.trim()).map((value) => value.trim()));
};

const readClaimToggles = async (
  page: Page,
  claimNames: readonly string[],
  area: string,
): Promise<Readonly<Record<string, boolean>>> => {
  const wanted = claimNames.map((claim) => ({
    original: claim,
    normalized: normalizedUiText(claim),
  }));
  const controls = await page
    .locator('input[type="checkbox"]')
    .evaluateAll((elements, expected) => {
      const normalize = (value: string): string =>
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "");
      const claims = expected as readonly { original: string; normalized: string }[];
      const result: { normalized: string; checked: boolean }[] = [];

      elements.forEach((element) => {
        if (!(element instanceof HTMLInputElement) || !element.getClientRects().length) return;
        const parentLabel = element.closest("label")?.textContent ?? "";
        const associatedLabels = element.labels
          ? Array.from(element.labels).map((label) => label.textContent ?? "")
          : [];
        const label = [...associatedLabels, parentLabel].join(" ").trim();
        const key = normalize(
          [
            element.id,
            element.getAttribute("name") ?? "",
            element.getAttribute("aria-label") ?? "",
            label,
          ].join(" "),
        );
        if (!/claim|reclam/.test(key)) return;

        const candidates = [element.value, label];
        const match = claims.find((claim) =>
          candidates.some((candidate) => normalize(candidate) === claim.normalized),
        );
        if (match) result.push({ normalized: match.normalized, checked: element.checked });
      });
      return result;
    }, wanted);

  const result: Record<string, boolean> = {};
  for (const claim of wanted) {
    const matches = controls.filter((control) => control.normalized === claim.normalized);
    if (matches.length !== 1) throw new UnverifiedConfigurationError(area);
    result[claim.original] = matches[0]!.checked;
  }
  return Object.freeze(result);
};

export async function inspectPublicClient(
  page: Page,
  credentials: IdentityServerAdminCredentials,
): Promise<PublicClientInspection> {
  await navigateToAdminSection(page, credentials, "clients");
  await openEntityDetails(page, credentials.expected.publicClientId, "cliente público");
  return Object.freeze({
    clientId: await readTextControl(page, ["clientid"], "clientId"),
    requireClientSecret: await readBooleanControl(
      page,
      ["requireclientsecret"],
      "secreto del cliente",
    ),
    requirePkce: await readBooleanControl(page, ["requirepkce"], "PKCE requerido"),
    allowPlainTextPkce: await readBooleanControl(
      page,
      ["allowplaintextpkce"],
      "PKCE en texto plano",
    ),
    allowedScopes: await readAllowedScopes(page, "scopes permitidos"),
  });
}

export async function inspectApiResource(
  page: Page,
  credentials: IdentityServerAdminCredentials,
): Promise<ApiResourceInspection> {
  await navigateToAdminSection(page, credentials, "apiResources");
  await openEntityDetails(page, credentials.expected.apiResourceName, "recurso API");
  const claimNames = ["role", "name", ...credentials.expected.apiResourceClaims].filter(
    (claim, index, all) =>
      all.findIndex((candidate) => normalizedUiText(candidate) === normalizedUiText(claim)) ===
      index,
  );
  return Object.freeze({
    name: await readTextControl(page, ["name", "apiresourcename"], "nombre del recurso API"),
    claims: await readClaimToggles(page, claimNames, "claims del recurso API"),
  });
}

export async function inspectApiScope(
  page: Page,
  credentials: IdentityServerAdminCredentials,
): Promise<ApiScopeInspection> {
  await navigateToAdminSection(page, credentials, "apiScopes");
  await openEntityDetails(page, credentials.expected.apiScopeName, "scope API");
  const claimNames = ["role", "name", ...credentials.expected.apiScopeClaims].filter(
    (claim, index, all) =>
      all.findIndex((candidate) => normalizedUiText(candidate) === normalizedUiText(claim)) ===
      index,
  );
  return Object.freeze({
    name: await readTextControl(page, ["name", "apiscopename"], "nombre del scope API"),
    claims: await readClaimToggles(page, claimNames, "claims del scope API"),
  });
}

/** Logs in through the hosted STS and returns only after the browser is back at the panel. */
export async function loginToIdentityServerAdmin(
  page: Page,
  credentials: IdentityServerAdminCredentials,
): Promise<void> {
  const panelOrigin = new URL(credentials.panelUrl).origin;
  const loginUrl = new URL("/account/login", credentials.panelUrl);

  try {
    await page.goto(loginUrl.toString(), { waitUntil: "domcontentloaded" });
  } catch {
    throw loginFailure("navigation");
  }

  let initialUrl: URL;
  try {
    initialUrl = new URL(page.url());
  } catch {
    throw loginFailure("expected_STS");
  }
  if (initialUrl.origin !== IDENTITYSERVER_AUTHORITY) {
    throw loginFailure("expected_STS");
  }

  let username: ReturnType<Page["locator"]>;
  let password: ReturnType<Page["locator"]>;
  let submit: ReturnType<Page["locator"]>;
  try {
    username = page.locator("#Username");
    password = page.locator("#Password");
    submit = page.locator('button[name="button"][value="login"]');
    await username.waitFor({ state: "visible" });
    await password.waitFor({ state: "visible" });
    await submit.waitFor({ state: "visible" });
    await username.fill(credentials.username);
    await password.fill(credentials.password);
  } catch {
    throw loginFailure("form");
  }

  try {
    await Promise.all([
      page.waitForURL((url) => url.origin === panelOrigin, {
        timeout: 30_000,
        waitUntil: "domcontentloaded",
      }),
      submit.click(),
    ]);
  } catch {
    throw loginFailure("submit_return");
  }

  try {
    if (new URL(page.url()).origin !== panelOrigin) {
      throw new Error("unexpected return origin");
    }
  } catch {
    throw loginFailure("submit_return");
  }

  let isAuthenticated: boolean;
  try {
    isAuthenticated = await page.evaluate(async () => {
      let response: Response;
      try {
        response = await fetch("/User", {
          credentials: "same-origin",
          headers: { "X-ANTI-CSRF": "1" },
        });
      } catch {
        return false;
      }

      if (!response.ok) return false;

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return false;
      }
      if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
        return false;
      }
      return (payload as { readonly isAuthenticated?: unknown }).isAuthenticated === true;
    });
  } catch {
    throw loginFailure("session_check");
  }

  if (isAuthenticated !== true) {
    throw loginFailure("session_check");
  }
}

export function hasConfiguredValue(values: readonly string[], expected: string): boolean {
  return values.some((value) => value === expected);
}

export function selectedClaimNames(claims: Readonly<Record<string, boolean>>): readonly string[] {
  return Object.entries(claims)
    .filter(([, selected]) => selected)
    .map(([claim]) => claim)
    .sort((left, right) => normalizedUiText(left).localeCompare(normalizedUiText(right)));
}

export function normalizedClaimNames(claims: readonly string[]): readonly string[] {
  return claims
    .map((claim) => claim.trim())
    .sort((left, right) => normalizedUiText(left).localeCompare(normalizedUiText(right)));
}
