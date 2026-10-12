import { request } from "@/services/http/apiClient";
import type {
  BloqueoEmergenciaDetalleDto,
  BloqueoEmergenciaListItemDto,
  CreateBloqueoEmergenciaDto,
  MarcarContactadoDto,
  PedidoAfectadoDto,
  ResolverAfectadoDto,
} from "@/types/disponibilidad/emergenciaDto";

const emergenciasPath = "/agenda/emergencias" as const;

export class EmergenciasApi {
  createEmergencia(dto: CreateBloqueoEmergenciaDto): Promise<BloqueoEmergenciaDetalleDto> {
    return request(emergenciasPath, { method: "POST", auth: "required", body: dto });
  }

  getEmergencias(): Promise<BloqueoEmergenciaListItemDto[]> {
    return request(emergenciasPath, { method: "GET", auth: "required" });
  }

  getEmergencia(id: number): Promise<BloqueoEmergenciaDetalleDto> {
    return request(`${emergenciasPath}/${id}`, { method: "GET", auth: "required" });
  }

  marcarContactado(
    emergenciaId: number,
    afectadoId: number,
    dto: MarcarContactadoDto,
  ): Promise<PedidoAfectadoDto> {
    return request(`${emergenciasPath}/${emergenciaId}/afectados/${afectadoId}/contactado`, {
      method: "PATCH",
      auth: "required",
      body: dto,
    });
  }

  resolverAfectado(
    emergenciaId: number,
    afectadoId: number,
    dto: ResolverAfectadoDto,
  ): Promise<PedidoAfectadoDto> {
    return request(
      `${emergenciasPath}/${encodeURIComponent(String(emergenciaId))}/afectados/${encodeURIComponent(String(afectadoId))}/resolver`,
      { method: "POST", auth: "required", body: dto },
    );
  }

  retirarEmergencia(emergenciaId: number): Promise<BloqueoEmergenciaDetalleDto> {
    return request(`${emergenciasPath}/${encodeURIComponent(String(emergenciaId))}/retirar`, {
      method: "POST",
      auth: "required",
    });
  }
}

export const emergenciasApi = new EmergenciasApi();
