import { useFetch } from "@/composables/useFetch";
import type {
  ComponenteDto,
  CreateComponenteDto,
  UpdateComponenteDto,
} from "@/types/products/ComponenteDto";

export class ComponentsApi {
  async getComponentes(): Promise<ComponenteDto[]> {
    const result = await useFetch<ComponenteDto[]>("productos/componentes", {
      method: "GET",
      auth: "required",
    });
    return result || [];
  }

  async createComponentes(componente: CreateComponenteDto): Promise<ComponenteDto | null> {
    const result = await useFetch<ComponenteDto>("productos/componentes/new", {
      method: "POST",
      auth: "required",
      body: JSON.stringify(componente),
    });
    return result || null;
  }

  async updateComponente(id: number, data: UpdateComponenteDto): Promise<ComponenteDto | null> {
    const result = await useFetch<ComponenteDto>(`productos/componentes/${id}`, {
      method: "PATCH",
      auth: "required",
      body: JSON.stringify(data),
    });
    // `useFetch` no comprueba `response.ok`: un 4xx con ProblemDetails llega
    // como "resultado". Solo es éxito si la respuesta trae el componente.
    return result && typeof result.id === "number" ? result : null;
  }
}
