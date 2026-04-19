import { useFetch } from "@/composables/useFetch";
import type { ComponenteDto, CreateComponenteDto } from "@/types/products/ComponenteDto";

export class ComponentsApi {
  async getComponentes(): Promise<ComponenteDto[]> {
    const result = await useFetch<ComponenteDto[]>("productos/componentes", {
      method: "GET",
    });
    return result || [];
  }

  async createComponentes(componente: CreateComponenteDto): Promise<ComponenteDto | null> {
    const result = await useFetch<ComponenteDto>("productos/componentes/new", {
      method: "POST",
      body: JSON.stringify(componente),
    });
    return result || null;
  }
}
