import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { analyzeBackend } from "./analyzer";
import { generateContractFiles } from "./generator";
import { probeEndpoint } from "./probe";
import type { BackendContractManifest, HttpMethod, ProbeResult } from "./types";
import { HTTP_METHODS } from "./types";

interface CliOptions {
  backendRoot: string;
  outputDir: string;
  check: boolean;
  help: boolean;
  probe?: { method: HttpMethod; path: string };
  query: Record<string, unknown>;
  pathParams: Record<string, string | number>;
  body?: unknown;
  baseUrl: string;
  tokenEnv: string;
  saveResponse?: string;
  allowMutations: boolean;
  confirmMutation: boolean;
}

function usage(): string {
  return `Backend Contract Inspector

Analiza controladores, servicios y DTOs NestJS con Tree-sitter y genera contratos
TypeScript aislados para el frontend.

Uso:
  bun run backend:inspect
  bun run backend:inspect -- --check
  bun run backend:inspect -- --probe GET /api/config/contacto
  bun run backend:inspect -- --probe GET /api/productos --query '{"page":1,"limit":20}'
  bun run backend:inspect -- --probe GET /api/productos/:id --path-params '{"id":1}'

Opciones:
  --backend <ruta>              Raíz del backend (por defecto ../AniaHechoAManoBackend)
  --output <ruta>               Carpeta generada (por defecto src/generated/backend-contract)
  --check                       No escribe; falla si los artefactos están desactualizados
  --probe <método> <ruta>       Ejecuta una consulta contra el backend
  --query <json>                Query string como objeto JSON
  --path-params <json>          Valores para :params de la ruta
  --body <json>                 Cuerpo JSON (solo con autorización explícita para mutaciones)
  --base-url <url>              URL del backend (por defecto BACKEND_BASE_URL o http://localhost:3001)
  --token-env <nombre>          Variable con el Bearer token (por defecto BACKEND_ACCESS_TOKEN)
  --save-response <ruta>        Guarda la respuesta de la consulta en JSON
  --allow-mutations             Habilita POST/PUT/PATCH/DELETE de forma explícita
  --confirm-mutation             Confirma la ejecución de una mutación explícita
  --help                        Muestra esta ayuda
`;
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Falta el valor de ${flag}.`);
  return value;
}

function parseJsonObject(value: string, flag: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch (error) {
    throw new Error(`${flag} debe ser JSON válido: ${String(error)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${flag} debe contener un objeto JSON.`);
  }
  return parsed as Record<string, unknown>;
}

function parsePathParams(value: string): Record<string, string | number> {
  const parsed = parseJsonObject(value, "--path-params");
  const result: Record<string, string | number> = {};
  for (const [key, item] of Object.entries(parsed)) {
    if (typeof item !== "string" && typeof item !== "number") {
      throw new Error(`El parámetro de ruta "${key}" debe ser string o number.`);
    }
    result[key] = item;
  }
  return result;
}

function parseMethod(value: string): HttpMethod {
  const method = value.toUpperCase();
  if (!HTTP_METHODS.includes(method as HttpMethod)) {
    throw new Error(`Método HTTP no soportado: ${value}.`);
  }
  return method as HttpMethod;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    backendRoot: "../AniaHechoAManoBackend",
    outputDir: "src/generated/backend-contract",
    check: false,
    help: false,
    query: {},
    pathParams: {},
    baseUrl: process.env.BACKEND_BASE_URL ?? "http://localhost:3001",
    tokenEnv: "BACKEND_ACCESS_TOKEN",
    allowMutations: false,
    confirmMutation: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    switch (argument) {
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--check":
        options.check = true;
        break;
      case "--backend":
        options.backendRoot = requireValue(args, index, argument);
        index += 1;
        break;
      case "--output":
        options.outputDir = requireValue(args, index, argument);
        index += 1;
        break;
      case "--probe": {
        const method = parseMethod(requireValue(args, index, argument));
        const path = args[index + 2];
        if (!path || path.startsWith("--")) throw new Error("--probe requiere método y ruta.");
        options.probe = { method, path };
        index += 2;
        break;
      }
      case "--query":
        options.query = parseJsonObject(requireValue(args, index, argument), argument);
        index += 1;
        break;
      case "--path-params":
        options.pathParams = parsePathParams(requireValue(args, index, argument));
        index += 1;
        break;
      case "--body": {
        const value = requireValue(args, index, argument);
        try {
          options.body = JSON.parse(value) as unknown;
        } catch (error) {
          throw new Error(`--body debe ser JSON válido: ${String(error)}`);
        }
        index += 1;
        break;
      }
      case "--base-url":
        options.baseUrl = requireValue(args, index, argument);
        index += 1;
        break;
      case "--token-env":
        options.tokenEnv = requireValue(args, index, argument);
        index += 1;
        break;
      case "--save-response":
        options.saveResponse = requireValue(args, index, argument);
        index += 1;
        break;
      case "--allow-mutations":
        options.allowMutations = true;
        break;
      case "--confirm-mutation":
        options.confirmMutation = true;
        break;
      default:
        throw new Error(`Opción desconocida: ${argument}. Usa --help.`);
    }
  }

  if (options.probe && options.probe.method !== "GET") {
    if (!options.allowMutations || !options.confirmMutation) {
      throw new Error(
        "Las mutaciones están bloqueadas por defecto. Añade --allow-mutations y --confirm-mutation de forma explícita.",
      );
    }
  }
  if (options.body !== undefined && options.probe?.method === "GET") {
    throw new Error("GET no acepta --body; usa --query o una mutación explícitamente autorizada.");
  }

  return options;
}

function shapeLabel(shape: BackendContractManifest["endpoints"][number]["response"]["type"]): string {
  if (shape.kind === "reference") {
    const args = shape.args?.length ? `<${shape.args.map(shapeLabel).join(", ")}>` : "";
    return `${shape.name ?? "unknown"}${args}`;
  }
  if (shape.kind === "array") return `Array<${shape.element ? shapeLabel(shape.element) : "unknown"}>`;
  if (shape.kind === "binary") return "binary";
  if (shape.kind === "object") return "object";
  if (shape.kind === "primitive") return shape.name ?? "unknown";
  if (shape.kind === "union" || shape.kind === "intersection") {
    const separator = shape.kind === "intersection" ? " & " : " | ";
    return shape.variants?.map(shapeLabel).join(separator) ?? "unknown";
  }
  return shape.kind;
}

function printSummary(manifest: BackendContractManifest): void {
  console.log(`Analizados ${manifest.endpoints.length} endpoints y ${manifest.declarations.length} declaraciones.`);
  for (const endpoint of manifest.endpoints) {
    console.log(
      `${endpoint.method.padEnd(7)} ${endpoint.path.padEnd(58)} -> ${String(endpoint.response.status)} ${shapeLabel(endpoint.response.type)} (${endpoint.auth})`,
    );
  }
  if (manifest.warnings.length) {
    console.warn(`\nAdvertencias (${manifest.warnings.length}):`);
    for (const warning of manifest.warnings) console.warn(`- ${warning}`);
  }
}

async function writeGeneratedFiles(outputDir: string, files: Record<string, string>): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await writeFile(resolve(outputDir, name), content, "utf8");
  }
}

async function checkGeneratedFiles(outputDir: string, files: Record<string, string>): Promise<string[]> {
  const stale: string[] = [];
  for (const [name, expected] of Object.entries(files)) {
    try {
      const actual = await readFile(resolve(outputDir, name), "utf8");
      if (actual !== expected) stale.push(name);
    } catch {
      stale.push(name);
    }
  }
  return stale;
}

async function saveProbeResult(path: string, result: ProbeResult): Promise<void> {
  const outputPath = resolve(path);
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

export async function runCli(argv: string[]): Promise<number> {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return 0;
  }

  const manifest = await analyzeBackend(options.backendRoot);
  const files = generateContractFiles(manifest);
  const outputDir = resolve(options.outputDir);

  if (options.check) {
    const stale = await checkGeneratedFiles(outputDir, files);
    if (stale.length) {
      console.error(`Contrato desactualizado. Ejecuta bun run backend:inspect para regenerar: ${stale.join(", ")}`);
      return 1;
    }
    console.log("Contrato backend/frontend sincronizado.");
  } else {
    await writeGeneratedFiles(outputDir, files);
    console.log(`Contrato generado en ${outputDir}.`);
  }

  printSummary(manifest);

  if (options.probe) {
    const accessToken = process.env[options.tokenEnv];
    const result = await probeEndpoint({
      manifest,
      baseUrl: options.baseUrl,
      method: options.probe.method,
      path: options.probe.path,
      query: options.query,
      pathParams: options.pathParams,
      body: options.body,
      accessToken,
    });
    console.log("\nConsulta ejecutada:");
    console.log(JSON.stringify(result, null, 2));
    if (options.saveResponse) await saveProbeResult(options.saveResponse, result);
  }

  return 0;
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedFile === currentFile) {
  runCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
