import { useFetch } from "@/composables/useFetch";
import type { ClienteListItemDto } from "@/types/orders/createOrderDto";

export class ClientesApi {
  async searchClientes(search?: string): Promise<ClienteListItemDto[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const result = await useFetch<ClienteListItemDto[]>(`clientes${query}`, {
      method: "GET",
    });
    return result || [];
  }
}
