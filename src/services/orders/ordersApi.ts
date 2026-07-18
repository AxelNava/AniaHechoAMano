import { useFetch } from "@/composables/useFetch";
import type { ConfirmarPedidoDto } from "@/types/orders/confirmarPedidoDto";
import type { CotizarPedidoDto } from "@/types/orders/cotizarPedidoDto";
import type { CreateOrderDto } from "@/types/orders/createOrderDto";
import type { CreatePedidoPublicoDto } from "@/types/orders/createPedidoPublicoDto";
import type {
  PaginatedResponseDto,
  PedidoDetalleDto,
  PedidoHistorialListItemDto,
  PedidoHistorialQueryDto,
  PedidoProductoImagenDto,
} from "@/types/orders/orderHistoryDto";

const apiBackend = import.meta.env.VITE_VUE_APP_DOMAIN || "http://localhost:5001";
const api = `${apiBackend}/api`;

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
    >(`pedidos${queryString}`, { method: "GET" });

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

  async createOrder(payload: CreateOrderDto): Promise<PedidoDetalleDto> {
    const response = await fetch(`${api}/pedidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        body && typeof body === "object" && "detail" in body
          ? String((body as { detail: unknown }).detail)
          : `Error ${response.status} al registrar el pedido`;
      throw new Error(detail);
    }

    return body as PedidoDetalleDto;
  }

  /**
   * Crea una solicitud de pedido pública (cliente final) — fase 1 del envío.
   * `POST /api/pedidos/solicitud`. El backend congela la receta server-side,
   * genera la `referencia_publica` y devuelve el detalle (con los ids de línea
   * necesarios para subir fotos en la fase 2).
   *
   * Usa `fetch` crudo + `response.ok` (patrón `createOrder`): con `useFetch` un
   * `ProblemDetails` de error llegaría como éxito porque no chequea el estado.
   */
  async createOrderPublico(payload: CreatePedidoPublicoDto): Promise<PedidoDetalleDto> {
    const response = await fetch(`${api}/pedidos/solicitud`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        body && typeof body === "object" && "detail" in body
          ? String((body as { detail: unknown }).detail)
          : `Error ${response.status} al enviar la solicitud de pedido`;
      throw new Error(detail);
    }

    return body as PedidoDetalleDto;
  }

  /**
   * Sube fotos de modificación a una línea de pedido — fase 2 del envío.
   * `POST /api/pedidos/:pedidoId/productos/:pedidoProductoId/imagenes`.
   *
   * Envía `FormData` con el campo `imagenes` (multipart) — NO fija
   * `Content-Type`: el navegador añade el boundary automáticamente. Usa `fetch`
   * crudo + `response.ok` para poder distinguir el fallo parcial (fase 2) del
   * éxito de la creación (fase 1).
   */
  async uploadModificacionImagenes(
    pedidoId: number,
    pedidoProductoId: number,
    files: File[],
  ): Promise<PedidoProductoImagenDto[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append("imagenes", file));

    const response = await fetch(
      `${api}/pedidos/${pedidoId}/productos/${pedidoProductoId}/imagenes`,
      { method: "POST", body: formData },
    );

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        body && typeof body === "object" && "detail" in body
          ? String((body as { detail: unknown }).detail)
          : `Error ${response.status} al subir las fotos de la modificación`;
      throw new Error(detail);
    }

    return (body as PedidoProductoImagenDto[]) ?? [];
  }

  /**
   * Confirma un pedido fijo (solo `PENDIENTE_CONFIRMACION`).
   * `POST /api/pedidos/:id/confirmar` (admin, aislado). El backend re-valida la
   * disponibilidad de la fecha (la solicitada o la `fecha_entrega_acordada`
   * ajustada que se envíe), fija la fecha y transiciona a
   * `ESPERANDO_ANTICIPO`/`CONFIRMADO`. Devuelve el detalle actualizado.
   *
   * Usa `fetch` crudo + `response.ok` (no `useFetch`): un `409` (fecha no
   * disponible / transición inválida) es un `ProblemDetails` que hay que surtir.
   */
  async confirmarPedido(
    pedidoId: number,
    dto: ConfirmarPedidoDto = {},
  ): Promise<PedidoDetalleDto> {
    const response = await fetch(`${api}/pedidos/${pedidoId}/confirmar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        body && typeof body === "object" && "detail" in body
          ? String((body as { detail: unknown }).detail)
          : `Error ${response.status} al confirmar el pedido`;
      throw new Error(detail);
    }

    return body as PedidoDetalleDto;
  }

  /**
   * Cotiza un pedido con modificación (solo `COTIZANDO`).
   * `POST /api/pedidos/:id/cotizar` (admin, aislado). Fija precio/tiempo por
   * línea, re-valida y fija la fecha acordada, y avanza el estado. Devuelve el
   * detalle actualizado.
   *
   * Usa `fetch` crudo + `response.ok` por la misma razón que `confirmarPedido`.
   */
  async cotizarPedido(pedidoId: number, dto: CotizarPedidoDto): Promise<PedidoDetalleDto> {
    const response = await fetch(`${api}/pedidos/${pedidoId}/cotizar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        body && typeof body === "object" && "detail" in body
          ? String((body as { detail: unknown }).detail)
          : `Error ${response.status} al cotizar el pedido`;
      throw new Error(detail);
    }

    return body as PedidoDetalleDto;
  }
}
