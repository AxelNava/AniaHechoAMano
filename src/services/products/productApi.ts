import { IProductApi } from "@/services/interfaces/IProductApi";
import { API_BASE_URL, API_ORIGIN, request } from "@/services/http/apiClient";
import { ProductDto } from "@/types/products/ProductDto";
import { useFetch } from "@/composables/useFetch";
import {
  type PaginatedResponseDto,
  type ProductListQueryDto,
} from "@/types/orders/orderHistoryDto";
import type { ProductoInfoPedidoDto } from "@/types/orders/createOrderDto";
import type { ProductoOpcionesPedidoPublicoDto } from "@/types/products/ProductoOpcionesPedidoPublicoDto";

export const resolveProductImageUrl = (url: string) => {
  if (!url) return url;
  if (/^(blob:|data:|https?:\/\/)/.test(url)) return url;

  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
};

/**
 * Resuelve la URL del endpoint binario de una imagen de producto
 * (campo `binario_url`, p. ej. `/productos/1/imagenes/10/binario`). A
 * diferencia de `resolveProductImageUrl`, antepone el prefijo `/api` porque la
 * ruta vive bajo el controlador de la API, no en los estáticos. Es la fuente
 * fiable para mostrar la imagen sin depender del almacenamiento local temporal.
 */
export const resolveProductBinaryUrl = (binarioUrl: string) => {
  if (!binarioUrl) return binarioUrl;
  if (/^(blob:|data:|https?:\/\/)/.test(binarioUrl)) return binarioUrl;

  return `${API_BASE_URL}${binarioUrl.startsWith("/") ? "" : "/"}${binarioUrl}`;
};

export const getProductImageBinaryUrl = (imageId: number | string) =>
  `${API_BASE_URL}/productos/imagenes/${imageId}/binary`;

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

export class ProductApi implements IProductApi {
  public async getProducts(): Promise<ProductDto[]> {
    const result = await useFetch<ProductDto[]>("productos/all", {
      method: "GET",
      auth: "none",
    });
    return result || [];
  }

  public async getProductsPaginated(
    query: ProductListQueryDto = {},
  ): Promise<PaginatedResponseDto<ProductDto>> {
    const queryString = toQueryString(query as Record<string, unknown>);
    const result = await useFetch<PaginatedResponseDto<ProductDto> | ProductDto[]>(
      `productos${queryString}`,
      { method: "GET", auth: "none" },
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
      auth: "none",
    });
  }

  public async getProductOrderOptions(
    id: number,
  ): Promise<ProductoOpcionesPedidoPublicoDto | null> {
    return useFetch<ProductoOpcionesPedidoPublicoDto>(`productos/${id}/opciones-pedido`, {
      method: "GET",
      auth: "none",
    });
  }

  public async getProductOrderInfo(id: number): Promise<ProductoInfoPedidoDto | null> {
    return useFetch<ProductoInfoPedidoDto>(`productos/${id}/info-pedido`, {
      method: "GET",
      auth: "required",
    });
  }

  public async createProduct(
    product: Omit<ProductDto, "id"> | ProductDto,
  ): Promise<ProductDto | null> {
    return useFetch<ProductDto>("productos/new", {
      method: "POST",
      auth: "required",
      body: JSON.stringify(product),
    });
  }

  public async createProductWithImages(formData: FormData): Promise<ProductDto | null> {
    try {
      return await request<ProductDto>("/productos/new", {
        method: "POST",
        auth: "required",
        body: formData,
      });
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
      method: "PATCH",
      auth: "required",
      body: JSON.stringify(product),
    });
  }

  public async updateProductWithImages(id: number, formData: FormData): Promise<ProductDto | null> {
    try {
      return await request<ProductDto>(`/productos/${id}`, {
        method: "PATCH",
        auth: "required",
        body: formData,
      });
    } catch (error) {
      console.error("Error updating product with images:", error);
      return null;
    }
  }
}
