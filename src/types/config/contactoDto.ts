// Espejo manual de `ContactoConfigDto` del backend
// (`src/config-contacto/dto/contacto-config.dto.ts`). Configuración pública de
// contacto por Facebook (`GET /api/config/contacto`). La consume la pantalla de
// confirmación del pedido para enlazar a la página / Messenger de Ania.
//
// `messenger_url_template` es una plantilla: el cliente reemplaza `{ref}` por la
// referencia del pedido. Cadena vacía si no hay page id configurado.
export interface ContactoConfigDto {
  facebook_page_url: string;
  messenger_url_template: string;
}
