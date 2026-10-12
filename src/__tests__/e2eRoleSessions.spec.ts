import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  E2E_APP_ORIGIN,
  loadRealSessionFile,
  realBearerHeaders,
  realRoleAvailable,
} from "../../e2e/helpers/oidc";

const futureExpiry = () => Math.floor(Date.now() / 1000) + 3600;

function serializedUser(token: string, expiresAt = futureExpiry()): string {
  return JSON.stringify({ access_token: token, expires_at: expiresAt, profile: { sub: "user-1" } });
}

function leaf(token: string, expiresAt?: number) {
  return {
    origin: E2E_APP_ORIGIN,
    localStorage: [{ name: "oidc.user:test", value: serializedUser(token, expiresAt) }],
    sessionStorage: [],
  };
}

function writeSession(document: unknown): string {
  const directory = mkdtempSync(join(tmpdir(), "ania-e2e-role-session-"));
  const file = join(directory, "session.json");
  writeFileSync(file, JSON.stringify(document), "utf8");
  return file;
}

function messageOf(run: () => unknown): string {
  try {
    run();
    throw new Error("Expected failure");
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function clearSessionEnvironment(): void {
  vi.stubEnv("E2E_CREDENTIALS_FILE", undefined);
  vi.stubEnv("E2E_SESSION_FILE", undefined);
}

afterEach(() => vi.unstubAllEnvs());

describe("role session files", () => {
  it("parses an admin-only versioned envelope", () => {
    const file = writeSession({ version: 1, roles: { admin: leaf("admin-token") } });
    expect(loadRealSessionFile(file).accessToken).toBe("admin-token");
    expect(() => loadRealSessionFile(file, "comprador")).toThrow("comprador");
  });

  it("parses comprador when the versioned envelope includes it", () => {
    const file = writeSession({
      version: 1,
      roles: { admin: leaf("admin-token"), comprador: leaf("buyer-token") },
    });
    expect(loadRealSessionFile(file).accessToken).toBe("admin-token");
    expect(loadRealSessionFile(file, "comprador").accessToken).toBe("buyer-token");
  });

  it("parses a legacy leaf as admin only", () => {
    const file = writeSession(leaf("legacy-admin-token"));
    expect(loadRealSessionFile(file).accessToken).toBe("legacy-admin-token");
    expect(() => loadRealSessionFile(file, "comprador")).toThrow("comprador");
  });

  it("rejects expired users and unavailable roles", () => {
    const expired = writeSession({
      version: 1,
      roles: { admin: leaf("expired", 1), comprador: leaf("buyer-token") },
    });
    const missing = writeSession({ version: 1, roles: { admin: leaf("admin-token") } });
    expect(() => loadRealSessionFile(expired)).toThrow("non-expired");
    expect(() => loadRealSessionFile(missing, "comprador")).toThrow("comprador");
  });

  it("keeps malformed session errors sanitized", () => {
    const secret = "super-secret-token";
    const file = writeSession({ version: 1, roles: { admin: leaf(secret, 1) } });
    const message = messageOf(() => loadRealSessionFile(file));
    expect(message).not.toContain(secret);
    expect(message).not.toContain(file);
  });

  it.each([
    ["a legacy leaf", leaf("legacy-default-token")],
    ["an admin-only envelope", { version: 1, roles: { admin: leaf("admin-envelope-token") } }],
  ])("uses an explicit legacy session file for admin by default: %s", (_label, document) => {
    const file = writeSession(document);
    clearSessionEnvironment();
    vi.stubEnv("E2E_SESSION_FILE", file);
    expect(realRoleAvailable()).toBe(true);
    expect(realRoleAvailable("comprador")).toBe(false);
    expect(realBearerHeaders().Authorization).toMatch(
      /^Bearer (legacy-default|admin-envelope)-token$/,
    );
  });

  it("reports comprador available when its generated session exists", () => {
    const file = writeSession({
      version: 1,
      roles: { admin: leaf("admin-token"), comprador: leaf("buyer-token") },
    });
    clearSessionEnvironment();
    vi.stubEnv("E2E_SESSION_FILE", file);
    expect(realRoleAvailable("comprador")).toBe(true);
  });
});
