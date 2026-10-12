import type { Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import {
  chmodSync,
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_E2E_BASE_URL = "http://localhost:5173";

const normalizeE2EBaseUrl = (value: string): string => {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("[E2E config] E2E_BASE_URL must be a valid HTTP(S) origin.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "[E2E config] E2E_BASE_URL must be an HTTP(S) origin without credentials or a path.",
    );
  }
  return url.origin;
};

export const E2E_APP_ORIGIN = normalizeE2EBaseUrl(process.env.E2E_BASE_URL ?? DEFAULT_E2E_BASE_URL);
export const DEFAULT_E2E_CREDENTIALS_FILE = "playwright/.auth/credentials.json";
export const DEFAULT_E2E_REGISTRATION_CREDENTIALS_FILE =
  "playwright/.auth/registration-credentials.txt";
export const DEFAULT_REAL_ROLE_SESSION_FILE = "playwright/.auth/real-oidc.roles.json";

export type RequiredE2ERole = "admin" | "comprador";

export interface E2ERoleCredential {
  readonly username: string;
  readonly password: string;
}

export interface E2ECredentials {
  readonly version: 1;
  readonly roles: Readonly<{
    admin: E2ERoleCredential;
    comprador?: E2ERoleCredential;
    [role: string]: E2ERoleCredential | undefined;
  }>;
}

interface StorageEntry {
  name: string;
  value: string;
}

export interface RealSessionLeaf {
  origin: string;
  localStorage: StorageEntry[];
  sessionStorage: StorageEntry[];
}

interface RealSessionMaterial extends RealSessionLeaf {
  accessToken: string;
}

const realInstalledPages = new WeakMap<Page, RequiredE2ERole>();

const failRealConfiguration = (message: string): never => {
  throw new Error(`[E2E real] ${message}`);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const failCredentialsConfiguration = (field: string, problem: string): never => {
  throw new Error(`[E2E credentials] ${field} ${problem}`);
};

const rejectUnknownFields = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  field: string,
): void => {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) failCredentialsConfiguration(`${field}.${unknown}`, "is not allowed.");
};

const isPlaceholder = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return (
    /^<?replace_with_[a-z0-9_]+>?$/.test(normalized) ||
    /^(change-?me|placeholder|\.\.\.|your[-_](username|password))$/.test(normalized)
  );
};

const requireRecord = (value: unknown, field: string): Record<string, unknown> => {
  if (!isRecord(value)) return failCredentialsConfiguration(field, "must be an object.");
  return value;
};

const requireCredentialValue = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    return failCredentialsConfiguration(field, "must be a nonempty string.");
  }
  if (isPlaceholder(value)) {
    return failCredentialsConfiguration(field, "must not be a placeholder.");
  }
  return value;
};

/** Resolves the optional override relative to the repository working directory. */
export function resolveE2ECredentialsFile(): string {
  return resolve(process.cwd(), process.env.E2E_CREDENTIALS_FILE ?? DEFAULT_E2E_CREDENTIALS_FILE);
}

const resolveLocalOutputFile = (value: string | undefined, field: string, fallback: string): string => {
  const candidate = (value ?? fallback).trim();
  if (
    !candidate ||
    candidate.includes("\0") ||
    /[\r\n]/.test(candidate) ||
    /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(candidate) ||
    candidate.startsWith("\\\\") ||
    (/^[a-z][a-z\d+.-]*:/i.test(candidate) && !/^[a-z]:[\\/]/i.test(candidate))
  ) {
    throw new Error(`[E2E registration] ${field} must be a local file path.`);
  }
  return resolve(process.cwd(), candidate);
};

/** Resolves the optional registration credential output to a local file path. */
export function resolveE2ERegistrationCredentialsFile(): string {
  return resolveLocalOutputFile(
    process.env.E2E_REGISTRATION_CREDENTIALS_FILE,
    "E2E_REGISTRATION_CREDENTIALS_FILE",
    DEFAULT_E2E_REGISTRATION_CREDENTIALS_FILE,
  );
}

export interface GeneratedE2ECredentials {
  readonly username: string;
  readonly password: string;
}

const validateGeneratedCredential = (value: unknown, field: keyof GeneratedE2ECredentials): string => {
  if (typeof value !== "string" || !value.trim() || /[\r\n]/.test(value)) {
    throw new Error(`[E2E registration] generated ${field} must be a single nonempty line.`);
  }
  return value;
};

const fileSystemErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

const cleanupTemporaryFile = (file: string): void => {
  try {
    unlinkSync(file);
  } catch (error) {
    if (fileSystemErrorCode(error) !== "ENOENT") throw error;
  }
};

/** Replaces a destination atomically where supported, including existing Windows files. */
const replaceFile = (temporary: string, file: string): void => {
  try {
    renameSync(temporary, file);
    return;
  } catch (error) {
    const code = fileSystemErrorCode(error);
    if (
      process.platform !== "win32" ||
      !code ||
      !["EEXIST", "ENOTEMPTY", "EPERM"].includes(code)
    ) {
      throw error;
    }
  }

  // Windows does not let rename replace an existing file. The temporary file is
  // still in the same directory, so the subsequent rename remains a same-volume commit.
  try {
    unlinkSync(file);
  } catch (error) {
    if (fileSystemErrorCode(error) !== "ENOENT") throw error;
  }
  renameSync(temporary, file);
};

/** Writes generated registration credentials as a human-readable, mode-restricted TXT file. */
export function writeE2ERegistrationCredentials(
  credentials: GeneratedE2ECredentials,
): string {
  const username = validateGeneratedCredential(credentials.username, "username");
  const password = validateGeneratedCredential(credentials.password, "password");
  const file = resolveE2ERegistrationCredentialsFile();
  const temporary = `${file}.tmp-${process.pid}-${randomBytes(8).toString("hex")}`;
  const entry = `Username: ${username}\nPassword: ${password}\n`;

  let committed = false;
  let temporaryCreated = false;
  try {
    mkdirSync(dirname(file), { recursive: true });
    let existing = "";
    try {
      existing = readFileSync(file, "utf8");
    } catch (error) {
      if (fileSystemErrorCode(error) !== "ENOENT") throw error;
    }
    const separator =
      existing.length === 0
        ? ""
        : existing.endsWith("\n\n")
          ? ""
          : existing.endsWith("\n")
            ? "\n"
            : "\n\n";
    const contents = `${existing}${separator}${entry}`;
    const descriptor = openSync(temporary, "wx", 0o600);
    temporaryCreated = true;
    try {
      writeFileSync(descriptor, contents, { encoding: "utf8" });
    } finally {
      closeSync(descriptor);
    }
    chmodSync(temporary, 0o600);
    replaceFile(temporary, file);
    chmodSync(file, 0o600);
    committed = true;
    return file;
  } finally {
    if (!committed && temporaryCreated) cleanupTemporaryFile(temporary);
  }
}

/** Loads validated role credentials without including supplied values in failures. */
export function loadE2ECredentials(): E2ECredentials {
  const file = resolveE2ECredentialsFile();
  let source: string;
  try {
    if (!statSync(file).isFile()) throw new Error("not a file");
    source = readFileSync(file, "utf8");
  } catch {
    return failCredentialsConfiguration(
      "E2E_CREDENTIALS_FILE",
      "must identify a readable regular file.",
    );
  }

  let document: unknown;
  try {
    document = JSON.parse(source);
  } catch {
    return failCredentialsConfiguration("E2E_CREDENTIALS_FILE", "must contain valid JSON.");
  }

  const credentialDocument = requireRecord(document, "$");
  rejectUnknownFields(credentialDocument, ["version", "roles"], "$credentialFile");
  if (credentialDocument.version !== 1) {
    failCredentialsConfiguration("version", "must equal 1.");
  }
  const roleDocument = requireRecord(credentialDocument.roles, "roles");

  const roles: Record<string, E2ERoleCredential> = {};
  for (const [role, value] of Object.entries(roleDocument)) {
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(role)) {
      failCredentialsConfiguration("roles", "contains an invalid role name.");
    }
    const roleCredential = requireRecord(value, `roles.${role}`);
    rejectUnknownFields(roleCredential, ["username", "password"], `roles.${role}`);
    const usernameIsPlaceholder =
      typeof roleCredential.username === "string" && isPlaceholder(roleCredential.username);
    const passwordIsPlaceholder =
      typeof roleCredential.password === "string" && isPlaceholder(roleCredential.password);
    if (role !== "admin" && usernameIsPlaceholder && passwordIsPlaceholder) continue;

    roles[role] = Object.freeze({
      username: requireCredentialValue(roleCredential.username, `roles.${role}.username`),
      password: requireCredentialValue(roleCredential.password, `roles.${role}.password`),
    });
  }

  if (!roles.admin) failCredentialsConfiguration("roles.admin", "is required.");

  return Object.freeze({
    version: 1,
    roles: Object.freeze(roles),
  }) as E2ECredentials;
}

const validSerializedUser = (value: string): { accessToken: string } | undefined => {
  try {
    const user: unknown = JSON.parse(value);
    if (!isRecord(user) || !isRecord(user.profile)) return undefined;
    if (typeof user.access_token !== "string" || !user.access_token.trim()) return undefined;
    if (typeof user.profile.sub !== "string" || !user.profile.sub.trim()) return undefined;
    if (
      typeof user.expires_at !== "number" ||
      !Number.isFinite(user.expires_at) ||
      user.expires_at <= Date.now() / 1000
    ) {
      return undefined;
    }
    return { accessToken: user.access_token };
  } catch {
    return undefined;
  }
};

function parseSessionLeaf(value: unknown, role: RequiredE2ERole): RealSessionMaterial {
  if (!isRecord(value) || value.origin !== E2E_APP_ORIGIN) {
    return failRealConfiguration(`The ${role} session origin must be ${E2E_APP_ORIGIN}.`);
  }
  if (!Array.isArray(value.localStorage)) {
    return failRealConfiguration(`The ${role} session must contain a localStorage array.`);
  }
  if (!Array.isArray(value.sessionStorage)) {
    return failRealConfiguration(`The ${role} session must contain a sessionStorage array.`);
  }

  const localEntries: StorageEntry[] = [];
  for (const entry of value.localStorage) {
    if (!isRecord(entry) || typeof entry.name !== "string" || typeof entry.value !== "string") {
      return failRealConfiguration(
        `Every ${role} localStorage entry must contain string name and value fields.`,
      );
    }
    localEntries.push({ name: entry.name, value: entry.value });
  }
  const sessionEntries: StorageEntry[] = [];
  for (const entry of value.sessionStorage) {
    if (!isRecord(entry) || typeof entry.name !== "string" || typeof entry.value !== "string") {
      return failRealConfiguration(
        `Every ${role} sessionStorage entry must contain string name and value fields.`,
      );
    }
    sessionEntries.push({ name: entry.name, value: entry.value });
  }
  const users = localEntries
    .filter((entry) => entry.name.startsWith("oidc.user:"))
    .map((entry) => validSerializedUser(entry.value));
  if (!users.length || users.some((user) => !user)) {
    return failRealConfiguration(
      `The ${role} session localStorage needs oidc.user:* entries with non-expired serialized OIDC Users.`,
    );
  }
  return {
    origin: E2E_APP_ORIGIN,
    localStorage: localEntries,
    sessionStorage: sessionEntries,
    accessToken: users[0]!.accessToken,
  };
}

/** Reads either the versioned role envelope or the legacy admin-only leaf. */
export function loadRealSessionFile(
  file: string,
  role: RequiredE2ERole = "admin",
): RealSessionMaterial {
  let document: unknown;
  try {
    document = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return failRealConfiguration("The real session source must be readable valid JSON.");
  }
  if (isRecord(document) && document.version === 1 && isRecord(document.roles)) {
    if (!("admin" in document.roles)) {
      return failRealConfiguration("The admin role is unavailable.");
    }
    const admin = parseSessionLeaf(document.roles.admin, "admin");
    if (role === "admin") return admin;
    if (!(role in document.roles)) {
      return failRealConfiguration(`The ${role} role is unavailable.`);
    }
    return parseSessionLeaf(document.roles[role], role);
  }
  if (role !== "admin") return failRealConfiguration(`The ${role} role is unavailable.`);
  return parseSessionLeaf(document, role);
}

function loadRealSession(role: RequiredE2ERole = "admin"): RealSessionMaterial {
  // The generated role envelope is the normal source. E2E_SESSION_FILE remains
  // an explicit legacy/diagnostic override for sessions captured by older runs.
  const file = resolve(
    process.cwd(),
    process.env.E2E_SESSION_FILE ?? DEFAULT_REAL_ROLE_SESSION_FILE,
  );
  return loadRealSessionFile(file, role);
}

export function validateRealSessionLeaf(
  leaf: RealSessionLeaf,
  role: RequiredE2ERole,
): RealSessionMaterial {
  return parseSessionLeaf(leaf, role);
}

export function writeRealRoleSessions(
  roles: Readonly<{ admin: RealSessionLeaf; comprador?: RealSessionLeaf }>,
): void {
  parseSessionLeaf(roles.admin, "admin");
  if (roles.comprador) parseSessionLeaf(roles.comprador, "comprador");
  const file = resolve(process.cwd(), DEFAULT_REAL_ROLE_SESSION_FILE);
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, JSON.stringify({ version: 1, roles }), {
    encoding: "utf8",
    mode: 0o600,
  });
  renameSync(temporary, file);
}

export function realRoleAvailable(role: RequiredE2ERole = "admin"): boolean {
  try {
    loadRealSession(role);
    return true;
  } catch {
    return false;
  }
}

/** Injects the selected OIDC User into localStorage and transaction state into sessionStorage before app scripts run. */
export async function installRealOidcSession(
  page: Page,
  role: RequiredE2ERole = "admin",
): Promise<void> {
  const installedRole = realInstalledPages.get(page);
  if (installedRole === role) return;
  if (installedRole) return failRealConfiguration("A page cannot install two real E2E roles.");
  const session = loadRealSession(role);
  await page.addInitScript(
    ({ origin, localEntries, sessionEntries }) => {
      if (window.location.origin !== origin) return;
      for (const entry of localEntries) {
        if (window.localStorage.getItem(entry.name) === null) {
          window.localStorage.setItem(entry.name, entry.value);
        }
      }
      for (const entry of sessionEntries) {
        if (window.sessionStorage.getItem(entry.name) === null) {
          window.sessionStorage.setItem(entry.name, entry.value);
        }
      }
    },
    {
      origin: session.origin,
      localEntries: session.localStorage,
      sessionEntries: session.sessionStorage,
    },
  );
  realInstalledPages.set(page, role);
}

/** Headers for protected direct API setup calls only. */
export function realBearerHeaders(role: RequiredE2ERole = "admin"): Record<string, string> {
  return { Authorization: `Bearer ${loadRealSession(role).accessToken}` };
}

