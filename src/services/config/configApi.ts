import { useFetch } from "@/composables/useFetch";
import type { ContactoConfigDto } from "@/types/config/contactoDto";

/**
 * Cliente de la configuración pública de contacto del backend
 * (`GET /api/config/contacto`). La consume la pantalla de confirmación para
 * enlazar a la página / Messenger de Ania (texto prellenado con la referencia).
 */
export class ConfigApi {
  async getContacto(): Promise<ContactoConfigDto | null> {
    return useFetch<ContactoConfigDto>("config/contacto", { method: "GET" });
  }
}

export const configApi = new ConfigApi();
