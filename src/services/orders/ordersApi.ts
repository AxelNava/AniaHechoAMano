import { useFetch } from "@/composables/useFetch";
import { request } from "@/services/http/apiClient";
import type { ConfirmarPedidoDto } from "@/types/orders/confirmarPedidoDto";
import type { CotizarPedidoDto } from "@/types/orders/cotizarPedidoDto";
import type { CreateOrderDto } from "@/types/orders/createOrderDto";
import type { CreatePedidoPublicoDto } from "@/types/orders/createPedidoPublicoDto";
import type { PedidoSeguimientoDto } from "@/types/orders/seguimientoDto";
import type {
  PaginatedResponseDto,
  PedidoDetalleDto,
  PedidoHistorialListItemDto,
  PedidoHistorialQueryDto,
  PedidoProductoImagenDto,
} from "@/types/orders/orderHistoryDto";

const seguimientoPath = (token: string): `/pedidos/seguimiento/${string}` =>
  `/pedidos/seguimiento/${encodeURIComponent(token)}`;

const toQueryString = (query: Record<string, unknown>): string => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    ) {
      params.append(key, String(value));
    }
  });
  const raw = params.toString();
  return raw ? `?${raw}` : "";
};

export class OrdersApi {
  /** Historial global de pedidos (todos los productos), ordenado por fecha de entrega. */
  async getAllOrders(
    query: PedidoHistorialQueryDto = {},
  ): Promise<PaginatedResponseDto<PedidoHistorialListItemDto>> {
    const queryString = toQueryString(query as Record<string, unknown>);
    const result = await useFetch<
      PaginatedResponseDto<PedidoHistorialListItemDto> | PedidoHistorialListItemDto[]
    >(`pedidos${queryString}`, { method: "GET", auth: "required" });

    if (Array.isArray(result)) {
      return {
        data: result,
        meta: {
          page: query.page ?? 1,
          limit: query.limit ?? (result.length || 1),
          total: result.length,
          total_pages: 1,
        },
      };
    }

    return (
      result || {
        data: [],
        meta: { page: query.page ?? 1, limit: query.limit ?? 50, total: 0, total_pages: 0 },
      }
    );
  }

  async getSeguimiento(token: string): Promise<PedidoSeguimientoDto> {
    return request<PedidoSeguimientoDto>(seguimientoPath(token), {
      method: "GET",
      auth: "none",
    });
  }

  async createOrder(payload: CreateOrderDto): Promise<PedidoDetalleDto> {
    return request<PedidoDetalleDto>("/pedidos", {
      method: "POST",
      auth: "required",
      body: payload,
    });
  }

  /**
   * Crea una solicitud de pedido pública (cliente final) — fase 1 del envío.
   * `POST /api/pedidos/solicitud`. El backend congela la receta server-side,
   * genera la `referencia_publica` y devuelve el detalle (con los ids de línea
   * necesarios para subir fotos en la fase 2).
   */
  async createOrderPublico(payload: CreatePedidoPublicoDto): Promise<PedidoDetalleDto> {
    return request<PedidoDetalleDto>("/pedidos/solicitud", {
      method: "POST",
      auth: "none",
      body: payload,
    });
  }

  /**
   * Crea una solicitud de pedido usando la identidad OIDC vigente.
   * `POST /api/pedidos/solicitud-autenticada` deriva el cliente vinculado en el
   * backend; el navegador no envía ni el token ni un `cliente_id`.
   */
  async createOrderPublicoAutenticado(
    payload: CreatePedidoPublicoDto,
  ): Promise<PedidoDetalleDto> {
    return request<PedidoDetalleDto>("/pedidos/solicitud-autenticada", {
      method: "POST",
      auth: "required",
      body: payload,
    });
  }

  /**
   * Sube fotos de modificación a una línea de pedido — fase 2 del envío.
   * `POST /api/pedidos/:pedidoId/productos/:pedidoProductoId/imagenes`.
   *
   * Envía `FormData` con el campo `imagenes` (multipart) — NO fija
   * `Content-Type`: el navegador añade el boundary automáticamente.
   */
  async uploadModificacionImagenes(
    pedidoId: number,
    pedidoProductoId: number,
    files: File[],
  ): Promise<PedidoProductoImagenDto[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append("imagenes", file));

    return request<PedidoProductoImagenDto[]>(
      `/pedidos/${pedidoId}/productos/${pedidoProductoId}/imagenes`,
      { method: "POST", auth: "required", body: formData },
    );
  }

  /**
   * Confirma un pedido fijo (solo `PENDIENTE_CONFIRMACION`).
   * `POST /api/pedidos/:id/confirmar` (admin, aislado). El backend re-valida la
   * disponibilidad de la fecha (la solicitada o la `fecha_entrega_acordada`
   * ajustada que se envíe), fija la fecha y transiciona a
   * `ESPERANDO_ANTICIPO`/`CONFIRMADO`. Devuelve el detalle actualizado.
   */
  async confirmarPedido(pedidoId: number, dto: ConfirmarPedidoDto = {}): Promise<PedidoDetalleDto> {
    return request<PedidoDetalleDto>(`/pedidos/${pedidoId}/confirmar`, {
      method: "POST",
      auth: "required",
      body: dto,
    });
  }

  /**
   * Cotiza un pedido con modificación (solo `COTIZANDO`).
   * `POST /api/pedidos/:id/cotizar` (admin, aislado). Fija precio/tiempo por
   * línea, re-valida y fija la fecha acordada, y avanza el estado. Devuelve el
   * detalle actualizado.
   */
  async cotizarPedido(pedidoId: number, dto: CotizarPedidoDto): Promise<PedidoDetalleDto> {
    return request<PedidoDetalleDto>(`/pedidos/${pedidoId}/cotizar`, {
      method: "POST",
      auth: "required",
      body: dto,
    });
  }
}
