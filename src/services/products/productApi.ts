import { IProductApi } from "@/services/interfaces/IProductApi";
import { ProductDto } from "@/types/products/ProductDto";
import { useFetch } from "@/composables/useFetch";

export class ProductApi implements IProductApi {
  public async getProducts(): Promise<ProductDto[]> {
    return [];
  }
  public async createProduct(product: ProductDto): Promise<ProductDto | null> {
    console.log(JSON.stringify(product));
    const response = useFetch<ProductDto>("productos/new", {
      method: "POST",
      body: JSON.stringify(product),
    });
    console.log(response);
    return response;
  }
  public async updateProduct(product: ProductDto): Promise<ProductDto | null> {
    return product;
  }
}
