import { useFetch } from "@/composables/useFetch";
import type { CatalogProductDto } from "@/types/products/catalogProductDto";
import type {
  PaginatedResponseDto,
  ProductListQueryDto,
} from "@/types/orders/orderHistoryDto";

const emptyResponse = (query: ProductListQueryDto): PaginatedResponseDto<CatalogProductDto> => ({
  data: [],
  meta: { page: query.page ?? 1, limit: query.limit ?? 20, total: 0, total_pages: 0 },
});

const toQueryString = (query: Record<string, unknown>) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      const joined = value
        .filter((item) => item !== undefined && item !== null && item !== "")
        .join(",");
      if (joined) {
        params.append(key, joined);
      }
      return;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      params.append(key, String(value));
    }
  });
  const raw = params.toString();
  return raw ? `?${raw}` : "";
};

export class CatalogApi {
  /**
   * Lista los productos del catálogo público filtrados por una o varias
   * categorías, búsqueda por nombre y ordenamiento. Solo devuelve productos
   * activos.
   */
  public async getCatalogProducts(
    query: ProductListQueryDto = {},
  ): Promise<PaginatedResponseDto<CatalogProductDto>> {
    const queryString = toQueryString({ activo: true, ...query });
    const result = await useFetch<PaginatedResponseDto<CatalogProductDto> | CatalogProductDto[]>(
      `productos${queryString}`,
      { method: "GET" },
    );

    if (!result) {
      return emptyResponse(query);
    }

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

    return result;
  }
}

export const catalogApi = new CatalogApi();
