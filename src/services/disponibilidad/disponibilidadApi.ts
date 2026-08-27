import { useFetch } from "@/composables/useFetch";
import type {
  AgendaConfigDto,
  BloqueoDto,
  BloqueosQueryDto,
  CreateBloqueoDto,
  ImpactoBloqueoDto,
  UpdateAgendaConfigDto,
} from "@/types/disponibilidad/agendaDto";
import type {
  DiasDisponibilidadResponseDto,
  DisponibilidadResponseDto,
} from "@/types/disponibilidad/disponibilidadDto";

const apiBackend = import.meta.env.VITE_VUE_APP_DOMAIN || "http://localhost:5001";
const api = `${apiBackend}/api`;

/**
 * Lee el `detail` de un cuerpo `ProblemDetails` (RFC 7807) del backend, con un
 * mensaje de respaldo por código HTTP.
 */
const problemDetail = (body: unknown, status: number, fallback: string): string =>
  body && typeof body === "object" && "detail" in body
    ? String((body as { detail: unknown }).detail)
    : `Error ${status} — ${fallback}`;

/**
 * Cliente del módulo de disponibilidad del backend.
 *
 * Público (`getDias`/`evaluar`): usa `useFetch` a propósito — un día NO
 * disponible responde `200` con `{ disponible: false, ... }` (resultado de
 * negocio, no error HTTP), así que no necesita el chequeo de `response.ok`.
 *
 * Admin de agenda (`/api/agenda/*`, hoy sin proteger): las lecturas usan
 * `useFetch`; las mutaciones (PUT/POST/DELETE) usan `fetch` crudo + `response.ok`
 * para poder surtir el `ProblemDetails` real (p.ej. 409 al duplicar la fecha de
 * un bloqueo), que `useFetch` tragaría como éxito al no chequear el estado.
 */
export class DisponibilidadApi {
  /**
   * Disponibilidad de cada día en el rango `[desde, hasta]` (YYYY-MM-DD) para un
   * pedido de `minutos` estimados. El backend acota el rango a una ventana máxima.
   */
  async getDias(
    desde: string,
    hasta: string,
    minutos = 0,
  ): Promise<DiasDisponibilidadResponseDto | null> {
    const params = new URLSearchParams({
      desde,
      hasta,
      minutos_estimados: String(minutos),
    });

    return useFetch<DiasDisponibilidadResponseDto>(`disponibilidad/dias?${params.toString()}`, {
      method: "GET",
    });
  }

  /**
   * Evalúa una fecha concreta (`YYYY-MM-DD`) para un pedido de `minutos`
   * estimados. Devuelve motivos y fechas sugeridas cuando no está disponible.
   */
  async evaluar(fecha: string, minutos = 0): Promise<DisponibilidadResponseDto | null> {
    return useFetch<DisponibilidadResponseDto>("disponibilidad/evaluar", {
      method: "POST",
      body: JSON.stringify({ fecha, minutos_estimados: minutos }),
    });
  }

  // ----- Agenda (admin) -----

  /** Configuración singleton de agenda (`GET /api/agenda/config`). */
  async getConfig(): Promise<AgendaConfigDto | null> {
    return useFetch<AgendaConfigDto>("agenda/config", { method: "GET" });
  }

  /** Actualiza la configuración de agenda (`PUT /api/agenda/config`). */
  async updateConfig(dto: UpdateAgendaConfigDto): Promise<AgendaConfigDto> {
    const response = await fetch(`${api}/agenda/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(problemDetail(body, response.status, "no se pudo guardar la configuración"));
    }
    return body as AgendaConfigDto;
  }

  /**
   * Lista los bloqueos de agenda, opcionalmente acotados a un rango de días
   * (`GET /api/agenda/bloqueos?desde=&hasta=`). Ambos límites son días ISO
   * "YYYY-MM-DD" inclusivos (espejo de `BloqueosQueryDto` del backend).
   */
  async getBloqueos(query: BloqueosQueryDto = {}): Promise<BloqueoDto[]> {
    const params = new URLSearchParams();
    if (query.desde) params.append("desde", query.desde);
    if (query.hasta) params.append("hasta", query.hasta);
    const qs = params.toString();
    const result = await useFetch<BloqueoDto[]>(`agenda/bloqueos${qs ? `?${qs}` : ""}`, {
      method: "GET",
    });
    return result ?? [];
  }

  /** Consulta los pedidos/clientes que afectaría bloquear un día. */
  async getImpactoBloqueo(fecha: string): Promise<ImpactoBloqueoDto> {
    const params = new URLSearchParams({ fecha });
    const response = await fetch(`${api}/agenda/bloqueos/impacto?${params.toString()}`, {
      method: "GET",
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(problemDetail(body, response.status, "no se pudo consultar el impacto"));
    }
    return body as ImpactoBloqueoDto;
  }

  /** Crea un bloqueo de agenda (`POST /api/agenda/bloqueos`). */
  async createBloqueo(dto: CreateBloqueoDto): Promise<BloqueoDto> {
    const response = await fetch(`${api}/agenda/bloqueos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(problemDetail(body, response.status, "no se pudo crear el bloqueo"));
    }
    return body as BloqueoDto;
  }

  /** Elimina un bloqueo de agenda (`DELETE /api/agenda/bloqueos/:id`). */
  async deleteBloqueo(id: number): Promise<void> {
    const response = await fetch(`${api}/agenda/bloqueos/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(problemDetail(body, response.status, "no se pudo eliminar el bloqueo"));
    }
  }
}

export const disponibilidadApi = new DisponibilidadApi();
