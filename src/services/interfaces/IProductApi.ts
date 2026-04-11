import { ProductDto } from "@/types/products/ProductDto";

export interface IProductApi {
  getProducts: () => Promise<ProductDto[]>;
  createProduct: (product: ProductDto) => Promise<ProductDto | null>;
  updateProduct: (product: ProductDto) => Promise<ProductDto | null>;
}
