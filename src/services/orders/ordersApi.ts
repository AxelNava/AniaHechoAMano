import { useFetch } from "@/composables/useFetch";
import type { CreateOrderDto } from "@/types/orders/createOrderDto";
import type {
  PaginatedResponseDto,
  PedidoDetalleDto,
  PedidoHistorialListItemDto,
  PedidoHistorialQueryDto,
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
}
