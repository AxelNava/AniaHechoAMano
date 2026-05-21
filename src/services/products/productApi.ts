import { IProductApi } from "@/services/interfaces/IProductApi";
import { ProductDto } from "@/types/products/ProductDto";
import { useFetch } from "@/composables/useFetch";

export class ProductApi implements IProductApi {
  public async getProducts(): Promise<ProductDto[]> {
    const result = await useFetch<ProductDto[]>("productos/all", {
      method: "GET",
    });
    return result || [];
  }

  public async createProduct(product: ProductDto): Promise<ProductDto | null> {
    return useFetch<ProductDto>("productos/new", {
      method: "POST",
      body: JSON.stringify(product),
    });
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
}
