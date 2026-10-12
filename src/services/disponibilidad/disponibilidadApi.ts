import { useFetch } from "@/composables/useFetch";
import { request } from "@/services/http/apiClient";
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

/**
 * Cliente del módulo de disponibilidad del backend.
 *
 * Las consultas públicas declaran `auth: "none"`; toda la agenda administrativa
 * usa `request` con `auth: "required"` para conservar `ProblemDetails` y fallar
 * antes de acceder a la red cuando no existe un Bearer token.
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
      auth: "none",
    });
  }

  /**
   * Evalúa una fecha concreta (`YYYY-MM-DD`) para un pedido de `minutos`
   * estimados. Devuelve motivos y fechas sugeridas cuando no está disponible.
   */
  async evaluar(fecha: string, minutos = 0): Promise<DisponibilidadResponseDto | null> {
    return useFetch<DisponibilidadResponseDto>("disponibilidad/evaluar", {
      method: "POST",
      auth: "none",
      body: JSON.stringify({ fecha, minutos_estimados: minutos }),
    });
  }

  // ----- Agenda (admin) -----

  /** Configuración singleton de agenda (`GET /api/agenda/config`). */
  async getConfig(): Promise<AgendaConfigDto | null> {
    return request<AgendaConfigDto>("/agenda/config", { method: "GET", auth: "required" });
  }

  /** Actualiza la configuración de agenda (`PUT /api/agenda/config`). */
  async updateConfig(dto: UpdateAgendaConfigDto): Promise<AgendaConfigDto> {
    return request<AgendaConfigDto>("/agenda/config", {
      method: "PUT",
      auth: "required",
      body: dto,
    });
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

    return request<BloqueoDto[]>(`/agenda/bloqueos${qs ? `?${qs}` : ""}`, {
      method: "GET",
      auth: "required",
    });
  }

  /** Consulta los pedidos/clientes que afectaría bloquear un día. */
  async getImpactoBloqueo(fecha: string): Promise<ImpactoBloqueoDto> {
    const params = new URLSearchParams({ fecha });
    return request<ImpactoBloqueoDto>(`/agenda/bloqueos/impacto?${params.toString()}`, {
      method: "GET",
      auth: "required",
    });
  }

  /** Crea un bloqueo de agenda (`POST /api/agenda/bloqueos`). */
  async createBloqueo(dto: CreateBloqueoDto): Promise<BloqueoDto> {
    return request<BloqueoDto>("/agenda/bloqueos", {
      method: "POST",
      auth: "required",
      body: dto,
    });
  }

  /** Elimina un bloqueo de agenda (`DELETE /api/agenda/bloqueos/:id`). */
  async deleteBloqueo(id: number): Promise<void> {
    return request<void>(`/agenda/bloqueos/${id}`, {
      method: "DELETE",
      auth: "required",
    });
  }
}

export const disponibilidadApi = new DisponibilidadApi();
