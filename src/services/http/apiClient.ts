export type ProblemDetailsCode =
  | "DATABASE_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "UNKNOWN_ERROR";

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

type JsonRequestOptions = { method: "GET" } | { method: "POST" | "PATCH"; body: unknown };

const problemCodes: ProblemDetailsCode[] = [
  "DATABASE_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "UNKNOWN_ERROR",
];

const apiBackend = import.meta.env.VITE_VUE_APP_DOMAIN || "http://localhost:5001";
const api = `${apiBackend}/api`;

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

type ApiPath = `/agenda/emergencias${string}` | `/pedidos/seguimiento/${string}`;

export async function requestJson<T>(path: ApiPath, options: JsonRequestOptions): Promise<T> {
  const init: RequestInit = { method: options.method };
  if ("body" in options) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${api}${path}`, init);
  } catch (cause) {
    throw new ApiError("No se pudo conectar con la API.", null, null, cause);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    if (response.ok) {
      throw new ApiError(
        "La API devolvió una respuesta JSON inválida.",
        response.status,
        null,
        cause,
      );
    }
    throw new ApiError(
      `La API respondió con HTTP ${response.status}.`,
      response.status,
      null,
      cause,
    );
  }

  if (!response.ok) {
    const problem = isProblemDetails(body, response.status) ? body : null;
    throw new ApiError(
      problem?.detail ?? `La API respondió con HTTP ${response.status}.`,
      response.status,
      problem,
    );
  }

  return body as T;
}
