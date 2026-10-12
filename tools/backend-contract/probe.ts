import type {
  BackendContractManifest,
  EndpointContract,
  HttpMethod,
  ProbeResult,
} from "./types";

export interface ProbeOptions {
  manifest: BackendContractManifest;
  baseUrl: string;
  method: HttpMethod;
  path: string;
  query: Record<string, unknown>;
  pathParams: Record<string, string | number>;
  body?: unknown;
  accessToken?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

function normalizePath(path: string): string {
  const withoutQuery = path.split("?", 1)[0];
  const normalized = `/${withoutQuery}`.replaceAll(/\/+/g, "/");
  if (normalized === "/") return normalized;
  return normalized.replace(/\/$/, "");
}

interface EndpointMatch {
  endpoint: EndpointContract;
  template: string;
  inferredPathParams: Record<string, string>;
  score: number;
}

function matchTemplate(template: string, path: string): Record<string, string> | undefined {
  const parameterNames: string[] = [];
  const expression = normalizePath(template).replace(/:([A-Za-z_$][\w$]*)/g, (_match, name: string) => {
    parameterNames.push(name);
    return "([^/]+)";
  });
  const match = new RegExp(`^${expression}$`).exec(normalizePath(path));
  if (!match) return undefined;

  const parameters: Record<string, string> = {};
  for (const [index, name] of parameterNames.entries()) {
    const value = match[index + 1];
    if (value !== undefined && value !== `:${name}`) parameters[name] = decodeURIComponent(value);
  }
  return parameters;
}

function routeScore(template: string): number {
  return normalizePath(template)
    .split("/")
    .filter(Boolean)
    .reduce((score, segment) => score + (segment.startsWith(":") ? 0 : 100), 0);
}

function findEndpoint(
  manifest: BackendContractManifest,
  method: HttpMethod,
  path: string,
): EndpointMatch {
  const matches = manifest.endpoints.flatMap((endpoint) => {
    if (endpoint.method !== method) return [];
    return [endpoint.path, endpoint.clientPath].flatMap((template) => {
      const inferredPathParams = matchTemplate(template, path);
      return inferredPathParams === undefined
        ? []
        : [{ endpoint, template, inferredPathParams, score: routeScore(template) }];
    });
  });
  if (!matches.length) {
    throw new Error(`No se encontró el endpoint ${method} ${path} en el contrato estático.`);
  }

  const bestByEndpoint = new Map<string, EndpointMatch>();
  for (const match of matches) {
    const previous = bestByEndpoint.get(match.endpoint.id);
    if (!previous || match.score > previous.score) bestByEndpoint.set(match.endpoint.id, match);
  }
  const ranked = [...bestByEndpoint.values()].sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const tied = ranked.filter((match) => match.score === best.score);
  if (tied.length > 1) {
    throw new Error(
      `La ruta ${method} ${path} coincide con varios endpoints: ${tied.map((match) => match.endpoint.id).join(", ")}.`,
    );
  }
  return best;
}

function resolvePath(
  template: string,
  parameters: Record<string, string | number>,
): string {
  return template.replace(/:([A-Za-z_$][\w$]*)/g, (_match, name: string) => {
    const value = parameters[name];
    if (value === undefined || value === null) {
      throw new Error(`Falta el parámetro de ruta "${name}". Usa --path-params con un JSON.`);
    }
    return encodeURIComponent(String(value));
  });
}

function buildUrl(baseUrl: string, routePath: string, query: Record<string, unknown>): string {
  const normalizedBase = baseUrl.trim().replace(/\/+$/, "");
  const normalizedPath = normalizePath(routePath);
  const routeWithoutDuplicateApi =
    normalizedBase.endsWith("/api") && normalizedPath.startsWith("/api/")
      ? normalizedPath.slice("/api".length)
      : normalizedPath;
  const url = `${normalizedBase}${routeWithoutDuplicateApi}`;
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      const values = value.filter((item) => item !== undefined && item !== null && item !== "");
      if (values.length) parsed.searchParams.set(key, values.join(","));
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      parsed.searchParams.set(key, String(value));
    }
  }
  return parsed.toString();
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

async function readResponseBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`La respuesta supera el límite de ${maxBytes} bytes.`);
  }

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error(`La respuesta supera el límite de ${maxBytes} bytes.`);
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      totalBytes += result.value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error(`La respuesta supera el límite de ${maxBytes} bytes.`);
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function readResponseBody(response: Response, maxBytes: number): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  const bytes = await readResponseBytes(response, maxBytes);
  if (contentType.startsWith("image/") || contentType.includes("application/octet-stream")) {
    return { binary: true, byteLength: bytes.byteLength, contentType };
  }

  const text = new TextDecoder().decode(bytes);
  if (contentType.includes("application/json") || contentType.includes("+json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  }
  return text;
}

export async function probeEndpoint(options: ProbeOptions): Promise<ProbeResult> {
  const match = findEndpoint(options.manifest, options.method, options.path);
  const pathParams = { ...match.inferredPathParams, ...options.pathParams };
  const routePath = resolvePath(match.endpoint.path, pathParams);
  const url = buildUrl(options.baseUrl, routePath, options.query);
  const headers = new Headers();
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new Error("El timeout debe ser un entero positivo.");
  if (!Number.isInteger(maxResponseBytes) || maxResponseBytes <= 0) {
    throw new Error("El límite de respuesta debe ser un entero positivo.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    const responseHeaders: Record<string, string> = {};
    for (const name of ["content-type", "content-length", "location"]) {
      const value = response.headers.get(name);
      if (value) responseHeaders[name] = value;
    }

    return {
      endpointId: match.endpoint.id,
      request: {
        method: options.method,
        path: routePath,
        url,
        query: options.query,
        pathParams,
        ...(options.body === undefined ? {} : { body: options.body }),
      },
      response: {
        status: response.status,
        headers: responseHeaders,
        body: await readResponseBody(response, maxResponseBytes),
      },
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`La consulta ${options.method} ${options.path} superó el timeout de ${timeoutMs} ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
