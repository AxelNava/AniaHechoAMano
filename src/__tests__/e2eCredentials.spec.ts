import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadE2ECredentials,
  resolveE2ECredentialsFile,
  resolveE2ERegistrationCredentialsFile,
  writeE2ERegistrationCredentials,
} from "../../e2e/helpers/oidc";

const originalCredentialsFile = process.env.E2E_CREDENTIALS_FILE;
const originalRegistrationFile = process.env.E2E_REGISTRATION_CREDENTIALS_FILE;
const temporaryDirectories: string[] = [];
const validDocument = {
  version: 1,
  roles: {
    admin: { username: "admin@example.invalid", password: "admin-test-password" },
  },
};
const buyerCredential = {
  username: "buyer@example.invalid",
  password: "buyer-test-password",
};

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

function writeCredentials(document: unknown, raw = false): string {
  const directory = temporaryDirectory("ania-e2e-credentials-");
  const file = join(directory, "credentials.json");
  writeFileSync(file, raw ? String(document) : JSON.stringify(document), "utf8");
  return file;
}

function load(document: unknown) {
  process.env.E2E_CREDENTIALS_FILE = writeCredentials(document);
  return loadE2ECredentials();
}

function errorMessage(run: () => unknown): string {
  try {
    run();
    throw new Error("Expected the operation to fail");
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

afterEach(() => {
  if (originalCredentialsFile === undefined) delete process.env.E2E_CREDENTIALS_FILE;
  else process.env.E2E_CREDENTIALS_FILE = originalCredentialsFile;
  if (originalRegistrationFile === undefined) delete process.env.E2E_REGISTRATION_CREDENTIALS_FILE;
  else process.env.E2E_REGISTRATION_CREDENTIALS_FILE = originalRegistrationFile;

  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadE2ECredentials", () => {
  it("loads mandatory admin credentials without comprador", () => {
    expect(load(validDocument)).toEqual(validDocument);
  });

  it("loads comprador when both optional credential values are configured", () => {
    const document = {
      ...validDocument,
      roles: { ...validDocument.roles, comprador: buyerCredential },
    };

    expect(load(document)).toEqual(document);
  });

  it("treats a fully placeholder comprador entry as disabled", () => {
    const credentials = load({
      ...validDocument,
      roles: {
        ...validDocument.roles,
        comprador: {
          username: "REPLACE_WITH_COMPRADOR_USERNAME",
          password: "REPLACE_WITH_COMPRADOR_PASSWORD",
        },
      },
    });

    expect(credentials.roles).toEqual(validDocument.roles);
    expect(credentials.roles.comprador).toBeUndefined();
  });

  it("accepts future roles with safe names", () => {
    const document = {
      ...validDocument,
      roles: {
        ...validDocument.roles,
        operador_2: { username: "operator@example.invalid", password: "operator-test-password" },
      },
    };

    expect(load(document).roles.operador_2?.username).toBe("operator@example.invalid");
  });

  it("rejects a missing mandatory admin role", () => {
    expect(() => load({ version: 1, roles: {} })).toThrow("roles.admin");
  });

  it.each([
    [
      "roles.admin.username",
      {
        ...validDocument,
        roles: {
          ...validDocument.roles,
          admin: { ...validDocument.roles.admin, username: "REPLACE_WITH_ADMIN_USERNAME" },
        },
      },
    ],
    [
      "roles.comprador.password",
      {
        ...validDocument,
        roles: {
          ...validDocument.roles,
          comprador: {
            username: buyerCredential.username,
            password: "<REPLACE_WITH_COMPRADOR_PASSWORD>",
          },
        },
      },
    ],
  ])("rejects the placeholder at %s", (field, document) => {
    expect(() => load(document)).toThrow(field);
  });

  it("rejects malformed JSON", () => {
    process.env.E2E_CREDENTIALS_FILE = writeCredentials("{not-json", true);
    expect(() => loadE2ECredentials()).toThrow("valid JSON");
  });

  it.each([
    [{ ...validDocument, extra: true }, "extra"],
    [
      {
        ...validDocument,
        roles: { ...validDocument.roles, admin: { ...validDocument.roles.admin, token: "nope" } },
      },
      "roles.admin.token",
    ],
  ])("rejects unknown fields", (document, field) => {
    expect(() => load(document)).toThrow(field);
  });

  it.each(["Admin", "buyer role", "../admin"])("rejects the unsafe role name %s", (role) => {
    const roles = {
      ...validDocument.roles,
      [role]: { username: "future@example.invalid", password: "future-test-password" },
    };
    expect(() => load({ version: 1, roles })).toThrow("roles");
  });

  it.each([
    [{ version: 2, roles: validDocument.roles }, "version"],
    [{ version: 1, roles: [] }, "roles"],
    [
      {
        ...validDocument,
        roles: {
          ...validDocument.roles,
          admin: { username: " ", password: "valid-test-password" },
        },
      },
      "roles.admin.username",
    ],
  ])("rejects invalid schema shapes", (document, field) => {
    expect(() => load(document)).toThrow(field);
  });

  it("rejects missing files and directories with sanitized messages", () => {
    const directory = temporaryDirectory("ania-e2e-credentials-directory-");
    for (const path of [join(directory, "missing.json"), directory]) {
      process.env.E2E_CREDENTIALS_FILE = path;
      const message = errorMessage(() => loadE2ECredentials());
      expect(message).toContain("E2E_CREDENTIALS_FILE");
      expect(message).not.toContain(path);
    }
  });

  it("never leaks credential values in validation messages", () => {
    const username = "private-user-value";
    const password = "private-password-value";
    const message = errorMessage(() =>
      load({
        ...validDocument,
        roles: { ...validDocument.roles, "unsafe role": { username, password } },
      }),
    );

    expect(message).not.toContain(username);
    expect(message).not.toContain(password);
  });

  it("does not leak a partially configured comprador value", () => {
    const username = "private-buyer-value";
    const message = errorMessage(() =>
      load({
        ...validDocument,
        roles: {
          ...validDocument.roles,
          comprador: { username, password: "REPLACE_WITH_COMPRADOR_PASSWORD" },
        },
      }),
    );

    expect(message).toContain("roles.comprador.password");
    expect(message).not.toContain(username);
  });

  it("defaults to the ignored repository credential path", () => {
    delete process.env.E2E_CREDENTIALS_FILE;
    expect(resolveE2ECredentialsFile()).toBe(
      resolve(process.cwd(), "playwright/.auth/credentials.json"),
    );
  });
});

describe("writeE2ERegistrationCredentials", () => {
    const registrationCredentials = {
      username: "test-registration-user",
      password: "test-registration-password",
    };

    function registrationFile(name = "registration-credentials.txt"): string {
      const directory = temporaryDirectory("ania-e2e-registration-");
      const file = join(directory, name);
      process.env.E2E_REGISTRATION_CREDENTIALS_FILE = file;
      return file;
    }

    it("writes the stable Username/Password format", () => {
      const file = registrationFile();

      expect(writeE2ERegistrationCredentials(registrationCredentials)).toBe(file);
      expect(readFileSync(file, "utf8")).toBe(
        "Username: test-registration-user\nPassword: test-registration-password\n",
      );
    });

    it("resolves and writes a local override path", () => {
      const file = registrationFile("nested/registration-credentials.txt");

      expect(resolveE2ERegistrationCredentialsFile()).toBe(resolve(file));
      expect(writeE2ERegistrationCredentials(registrationCredentials)).toBe(resolve(file));
    });

    it.each(["username", "password"] as const)(
      "rejects newlines in %s without leaking the value",
      (field) => {
        const secret = `test-${field}-value\nsecond-line`;
        const credentials = {
          ...registrationCredentials,
          [field]: secret,
        };
        const message = errorMessage(() => writeE2ERegistrationCredentials(credentials));

        expect(message).toContain(`generated ${field}`);
        expect(message).not.toContain(secret);
      },
    );

    it("appends to an existing destination with a blank-line separator and leaves no temporary file", () => {
      const file = registrationFile();
      writeE2ERegistrationCredentials(registrationCredentials);

      const replacement = {
        username: "test-replacement-user",
        password: "test-replacement-password",
      };
      expect(writeE2ERegistrationCredentials(replacement)).toBe(file);
      expect(readFileSync(file, "utf8")).toBe(
        "Username: test-registration-user\nPassword: test-registration-password\n\n" +
          "Username: test-replacement-user\nPassword: test-replacement-password\n",
      );
      expect(readdirSync(resolve(file, ".."))).toEqual(["registration-credentials.txt"]);
    });

    it("uses restrictive permissions where file modes are available", () => {
      if (process.platform === "win32") return;
      const file = registrationFile();

      writeE2ERegistrationCredentials(registrationCredentials);

      expect(statSync(file).mode & 0o777).toBe(0o600);
    });

    it("rejects remote output overrides without exposing their value", () => {
      const secret = "test-registration-path-value";
      process.env.E2E_REGISTRATION_CREDENTIALS_FILE = `https://${secret}.invalid/output.txt`;

      const message = errorMessage(() => resolveE2ERegistrationCredentialsFile());
      expect(message).toContain("local file path");
      expect(message).not.toContain(secret);
  });
});
