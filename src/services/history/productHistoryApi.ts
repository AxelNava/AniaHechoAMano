import { useFetch } from "@/composables/useFetch";
import {
  type PaginatedResponseDto,
  type PedidoDetalleDto,
  type PedidoHistorialListItemDto,
  type PedidoHistorialQueryDto,
  type PedidoProductoComponenteSnapshotDto,
} from "@/types/orders/orderHistoryDto";

const toQueryString = (query: Record<string, string | number | boolean | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  const raw = params.toString();
  return raw ? `?${raw}` : "";
};

export class ProductHistoryApi {
  async getOrdersByProduct(
    productId: number,
    query: PedidoHistorialQueryDto = {},
  ): Promise<PaginatedResponseDto<PedidoHistorialListItemDto>> {
    const queryString = toQueryString(query);
    const result = await useFetch<
      PaginatedResponseDto<PedidoHistorialListItemDto> | PedidoHistorialListItemDto[]
    >(`productos/${productId}/pedidos/historial${queryString}`, { method: "GET" });

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
        meta: { page: query.page ?? 1, limit: query.limit ?? 20, total: 0, total_pages: 0 },
      }
    );
  }

  async getOrderById(orderId: number): Promise<PedidoDetalleDto | null> {
    return useFetch<PedidoDetalleDto>(`pedidos/${orderId}`, { method: "GET" });
  }

  async getOrderProductComponents(
    orderId: number,
    orderProductId: number,
  ): Promise<PedidoProductoComponenteSnapshotDto[]> {
    const result = await useFetch<PedidoProductoComponenteSnapshotDto[]>(
      `pedidos/${orderId}/productos/${orderProductId}/componentes`,
      { method: "GET" },
    );
    return result || [];
  }

  async getOrderProductComponentById(
    orderId: number,
    orderProductId: number,
    snapshotId: number,
  ): Promise<PedidoProductoComponenteSnapshotDto | null> {
    return useFetch<PedidoProductoComponenteSnapshotDto>(
      `pedidos/${orderId}/productos/${orderProductId}/componentes/${snapshotId}`,
      { method: "GET" },
    );
  }
}
