import { requestJson } from "@/services/http/apiClient";
import type {
  BloqueoEmergenciaDetalleDto,
  BloqueoEmergenciaListItemDto,
  CreateBloqueoEmergenciaDto,
  MarcarContactadoDto,
  PedidoAfectadoDto,
} from "@/types/disponibilidad/emergenciaDto";

const emergenciasPath = "/agenda/emergencias" as const;

export class EmergenciasApi {
  createEmergencia(dto: CreateBloqueoEmergenciaDto): Promise<BloqueoEmergenciaDetalleDto> {
    return requestJson(emergenciasPath, { method: "POST", body: dto });
  }

  getEmergencias(): Promise<BloqueoEmergenciaListItemDto[]> {
    return requestJson(emergenciasPath, { method: "GET" });
  }

  getEmergencia(id: number): Promise<BloqueoEmergenciaDetalleDto> {
    return requestJson(`${emergenciasPath}/${id}`, { method: "GET" });
  }

  marcarContactado(
    emergenciaId: number,
    afectadoId: number,
    dto: MarcarContactadoDto,
  ): Promise<PedidoAfectadoDto> {
    return requestJson(`${emergenciasPath}/${emergenciaId}/afectados/${afectadoId}/contactado`, {
      method: "PATCH",
      body: dto,
    });
  }
}

export const emergenciasApi = new EmergenciasApi();
