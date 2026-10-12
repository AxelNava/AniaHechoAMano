import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeBackend } from "./analyzer";
import { runCli } from "./cli";
import { generateContractFiles } from "./generator";
import { probeEndpoint } from "./probe";
import type { BackendContractManifest } from "./types";

const backendRoot = resolve(process.cwd(), "../AniaHechoAManoBackend");
const hasBackend = existsSync(resolve(backendRoot, "src"));
let originalFetch: typeof globalThis.fetch;

afterEach(() => {
  if (originalFetch) globalThis.fetch = originalFetch;
});

describe("backend contract inspector", () => {
  it.skipIf(!hasBackend)("extracts NestJS endpoints and response types", async () => {
    const manifest = await analyzeBackend(backendRoot);
    const products = manifest.endpoints.find((endpoint) => endpoint.id === "GET /api/productos");
    const productById = manifest.endpoints.find(
      (endpoint) => endpoint.id === "GET /api/productos/:id",
    );
    const publicOrder = manifest.endpoints.find(
      (endpoint) => endpoint.id === "POST /api/pedidos/solicitud",
    );

    expect(manifest.endpoints.length).toBeGreaterThanOrEqual(40);
    expect(products?.auth).toBe("public");
    expect(products?.request.parameters[0]?.type.name).toBe("ProductListQueryDto");
    expect(products?.response.type.name).toBe("PaginatedResponseDto");
    expect(products?.response.type.args?.[0]?.name).toBe("ProductDto");
    expect(productById?.request.parameters[0]?.type.name).toBe("number");
    expect(publicOrder?.request.parameters[0]?.type.name).toBe("CreatePedidoPublicoDto");
    expect(manifest.backend.parser).toBe("tree-sitter-typescript");
  });

  it.skipIf(!hasBackend)("selects the most specific route and infers concrete path parameters", async () => {
    const manifest = await analyzeBackend(backendRoot);
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      return new Response(url.endsWith("/componentes") ? "[]" : JSON.stringify({ id: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const components = await probeEndpoint({
      manifest,
      baseUrl: "http://localhost:3001",
      method: "GET",
      path: "/api/productos/componentes",
      query: {},
      pathParams: {},
    });
    const product = await probeEndpoint({
      manifest,
      baseUrl: "http://localhost:3001",
      method: "GET",
      path: "/api/productos/1",
      query: {},
      pathParams: {},
    });

    expect(components.endpointId).toBe("GET /api/productos/componentes");
    expect(product.endpointId).toBe("GET /api/productos/:id");
    expect(product.request.pathParams).toEqual({ id: "1" });
    expect(product.request.url).toBe("http://localhost:3001/api/productos/1");
  });

  it.skipIf(!hasBackend)("generates isolated typed DTOs and API calls", async () => {
    const manifest = await analyzeBackend(backendRoot);
    const files = generateContractFiles(manifest);

    expect(files["types.ts"]).toContain("export interface PaginatedResponseDto<T>");
    expect(files["types.ts"]).toContain("export type ProductDto");
    expect(files["api.ts"]).toContain(
      "export function getProducts(params: { query?: BackendContract.ProductListQueryDto } = {})",
    );
    expect(files["api.ts"]).toContain(
      "BackendContract.PaginatedResponseDto<BackendContract.ProductDto>",
    );
    expect(files["api.ts"]).toContain('auth: "none"');
    expect(files["api.ts"]).toContain('responseType: "blob"');
    expect(files["index.ts"]).toContain('export * from "./api"');
  });

  it("blocks mutating probes unless both safety flags are present", async () => {
    await expect(runCli(["--probe", "POST", "/api/categories/new"])).rejects.toThrow(
      "Las mutaciones están bloqueadas por defecto",
    );
    await expect(
      runCli(["--probe", "POST", "/api/categories/new", "--allow-mutations"]),
    ).rejects.toThrow("Las mutaciones están bloqueadas por defecto");
  });

  it("prints a typed query and the backend response without leaking credentials", async () => {
    const manifest: BackendContractManifest = {
      schemaVersion: 1,
      generator: "backend-contract-inspector",
      backend: { root: "../backend", framework: "nestjs", parser: "tree-sitter-typescript" },
      sourceHash: "test",
      declarations: [],
      warnings: [],
      endpoints: [
        {
          id: "GET /api/config/contacto",
          method: "GET",
          path: "/api/config/contacto",
          clientPath: "/config/contacto",
          controller: "ContactoController",
          handler: "getContacto",
          auth: "public",
          roles: [],
          request: { parameters: [] },
          response: {
            status: 200,
            contentType: "application/json",
            type: { kind: "object", properties: [] },
            source: "swagger",
          },
          source: { file: "src/contacto.controller.ts", line: 1, column: 1 },
          warnings: [],
        },
      ],
    };

    originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      expect(String(input)).toBe("http://localhost:3001/api/config/contacto?canal=facebook");
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer secret");
      return new Response(JSON.stringify({ facebook_page_url: "https://example.test" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await probeEndpoint({
      manifest,
      baseUrl: "http://localhost:3001",
      method: "GET",
      path: "/api/config/contacto",
      query: { canal: "facebook" },
      pathParams: {},
      accessToken: "secret",
    });

    expect(result.request.url).toBe("http://localhost:3001/api/config/contacto?canal=facebook");
    expect(result.response.status).toBe(200);
    expect(result.response.body).toEqual({ facebook_page_url: "https://example.test" });
    expect(JSON.stringify(result)).not.toContain("Authorization");
    expect(JSON.stringify(result)).not.toContain("secret");

    globalThis.fetch = async () =>
      new Response("12345", { status: 200, headers: { "content-type": "text/plain" } });
    await expect(
      probeEndpoint({
        manifest,
        baseUrl: "http://localhost:3001",
        method: "GET",
        path: "/api/config/contacto",
        query: {},
        pathParams: {},
        maxResponseBytes: 4,
      }),
    ).rejects.toThrow("límite de 4 bytes");
  });
});
