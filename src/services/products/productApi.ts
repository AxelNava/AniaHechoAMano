import { IProductApi } from "@/services/interfaces/IProductApi";
import { ProductDto } from "@/types/products/ProductDto";
import { useFetch } from "@/composables/useFetch";
import {
  type PaginatedResponseDto,
  type ProductListQueryDto,
} from "@/types/orders/orderHistoryDto";
import type { ProductoInfoPedidoDto } from "@/types/orders/createOrderDto";

const apiBackend = import.meta.env.VITE_VUE_APP_DOMAIN || "http://localhost:5001";
const api = `${apiBackend}/api`;

export const resolveProductImageUrl = (url: string) => {
  if (!url) return url;
  if (/^(blob:|data:|https?:\/\/)/.test(url)) return url;

  return `${apiBackend}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const getProductImageBinaryUrl = (imageId: number | string) =>
  `${api}/productos/imagenes/${imageId}/binary`;

const parseMultipartResponse = async (response: Response): Promise<ProductDto | null> => {
  const payload = (await response.json().catch(() => null)) as ProductDto | null;

  if (!response.ok) {
    throw new Error(`Error ${response.status} al consumir productos`);
  }

  return payload;
};

const toQueryString = (query: Record<string, unknown>) => {
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

export class ProductApi implements IProductApi {
  public async getProducts(): Promise<ProductDto[]> {
    const result = await useFetch<ProductDto[]>("productos/all", {
      method: "GET",
    });
    return result || [];
  }

  public async getProductsPaginated(
    query: ProductListQueryDto = {},
  ): Promise<PaginatedResponseDto<ProductDto>> {
    const queryString = toQueryString(query as Record<string, unknown>);
    const result = await useFetch<PaginatedResponseDto<ProductDto> | ProductDto[]>(
      `productos${queryString}`,
      { method: "GET" },
    );

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

  public async getProductById(id: number): Promise<ProductDto | null> {
    return useFetch<ProductDto>(`productos/${id}`, {
      method: "GET",
    });
  }

  public async getProductOrderInfo(id: number): Promise<ProductoInfoPedidoDto | null> {
    return useFetch<ProductoInfoPedidoDto>(`productos/${id}/info-pedido`, {
      method: "GET",
    });
  }

  public async createProduct(
    product: Omit<ProductDto, "id"> | ProductDto,
  ): Promise<ProductDto | null> {
    return useFetch<ProductDto>("productos/new", {
      method: "POST",
      body: JSON.stringify(product),
    });
  }

  public async createProductWithImages(formData: FormData): Promise<ProductDto | null> {
    try {
      const response = await fetch(`${api}/productos/new`, {
        method: "POST",
        body: formData,
      });

      return parseMultipartResponse(response);
    } catch (error) {
      console.error("Error creating product with images:", error);
      return null;
    }
  }

  public async updateProduct(product: ProductDto): Promise<ProductDto | null> {
    if (!product.id) {
      throw new Error("El producto debe incluir un id para actualizarse");
    }

    return useFetch<ProductDto>(`productos/${product.id}`, {
      method: "PUT",
      body: JSON.stringify(product),
    });
  }

  public async updateProductWithImages(id: number, formData: FormData): Promise<ProductDto | null> {
    try {
      const response = await fetch(`${api}/productos/${id}`, {
        method: "PATCH",
        body: formData,
      });

      return parseMultipartResponse(response);
    } catch (error) {
      console.error("Error updating product with images:", error);
      return null;
    }
  }
}
