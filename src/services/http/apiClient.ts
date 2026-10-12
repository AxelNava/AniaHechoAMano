import { authService } from "@/auth/authService";
import { publishHttpAuthSignal } from "@/services/http/httpAuthSignal";

export type ProblemDetailsCode =
  | "DATABASE_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "UNKNOWN_ERROR"
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_ACCESS_TOKEN"
  | "INSUFFICIENT_PERMISSIONS";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: ProblemDetailsCode;
}

export class ApiError extends Error {
  readonly status: number | null;
  readonly problem: ProblemDetails | null;

  constructor(
    message: string,
    status: number | null,
    problem: ProblemDetails | null,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

export type RequestAuth = "required" | "none";
export type ApiResponseType = "json" | "blob";
export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  auth: RequestAuth;
  body?: unknown;
  responseType?: ApiResponseType;
};

type JsonRequestOptions =
  | { method: "GET" }
  | { method: "POST"; body?: unknown }
  | { method: "PATCH"; body: unknown };

const problemCodes: ProblemDetailsCode[] = [
  "DATABASE_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "UNKNOWN_ERROR",
  "AUTHENTICATION_REQUIRED",
  "INVALID_ACCESS_TOKEN",
  "INSUFFICIENT_PERMISSIONS",
];

const DEFAULT_API_BASE_URL = "http://localhost:3001/api";

const normalizeApiBaseUrl = (value: string): string => value.trim().replace(/\/+$/, "");

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE_URL = normalizeApiBaseUrl(configuredApiBaseUrl || DEFAULT_API_BASE_URL);
export const API_ORIGIN = new URL(API_BASE_URL).origin;

const isProblemDetails = (body: unknown, httpStatus: number): body is ProblemDetails => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;

  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.type === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.status === "number" &&
    candidate.status === httpStatus &&
    typeof candidate.detail === "string" &&
    typeof candidate.code === "string" &&
    problemCodes.includes(candidate.code as ProblemDetailsCode)
  );
};

const missingTokenProblem: ProblemDetails = {
  type: "https://httpstatuses.com/401",
  title: "Unauthorized",
  status: 401,
  detail: "A valid Bearer access token is required.",
  code: "AUTHENTICATION_REQUIRED",
};

const asBodyInit = (body: unknown): BodyInit | undefined => {
  if (body === undefined) return undefined;
  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    (typeof ReadableStream !== "undefined" && body instanceof ReadableStream)
  ) {
    return body as BodyInit;
  }
  return JSON.stringify(body);
};

export async function request<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const { auth, body, responseType = "json", headers: requestedHeaders, ...init } = options;
  const headers = new Headers(requestedHeaders);

  if (auth === "required") {
    const token = await authService.getAccessToken();
    if (!token) {
      await publishHttpAuthSignal("session-expired");
      throw new ApiError(missingTokenProblem.detail, 401, missingTokenProblem);
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const preparedBody = asBodyInit(body);
  if (body instanceof FormData) headers.delete("Content-Type");
  else if (body !== undefined && preparedBody !== body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const entries = [...headers.entries()];
  const requestInit: RequestInit = { ...init };
  if (entries.length) {
    requestInit.headers = Object.fromEntries(
      entries.map(([name, value]) => [
        name === "content-type"
          ? "Content-Type"
          : name === "authorization"
            ? "Authorization"
            : name,
        value,
      ]),
    );
  }
  if (preparedBody !== undefined) requestInit.body = preparedBody;

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
      requestInit,
    );
  } catch (cause) {
    throw new ApiError("No se pudo conectar con la API.", null, null, cause);
  }

  if (response.ok && (response.status === 204 || response.status === 205)) return undefined as T;
  if (response.ok && responseType === "blob") return (await response.blob()) as T;

  let bodyResponse: unknown;
  let parseCause: unknown;
  try {
    bodyResponse = await response.json();
  } catch (cause) {
    parseCause = cause;
  }

  if (!response.ok) {
    const problem = isProblemDetails(bodyResponse, response.status) ? bodyResponse : null;
    const error = new ApiError(
      problem?.detail ?? `La API respondió con HTTP ${response.status}.`,
      response.status,
      problem,
      parseCause,
    );
    if (response.status === 401) await publishHttpAuthSignal("session-expired");
    if (response.status === 403) await publishHttpAuthSignal("forbidden");
    throw error;
  }

  if (parseCause !== undefined) {
    throw new ApiError(
      "La API devolvió una respuesta JSON inválida.",
      response.status,
      null,
      parseCause,
    );
  }
  return bodyResponse as T;
}

type ApiPath = `/agenda/emergencias${string}` | `/pedidos/seguimiento/${string}`;

export function requestJson<T>(path: ApiPath, options: JsonRequestOptions): Promise<T> {
  return request(path, { ...options, auth: "none" });
}
