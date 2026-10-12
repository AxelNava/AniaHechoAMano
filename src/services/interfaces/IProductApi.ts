import { ProductDto } from "@/types/products/ProductDto";
import type { ProductoOpcionesPedidoPublicoDto } from "@/types/products/ProductoOpcionesPedidoPublicoDto";
import type { ProductoInfoPedidoDto } from "@/types/orders/createOrderDto";

export interface IProductApi {
  getProducts: () => Promise<ProductDto[]>;
  getProductById: (id: number) => Promise<ProductDto | null>;
  getProductOrderOptions: (id: number) => Promise<ProductoOpcionesPedidoPublicoDto | null>;
  getProductOrderInfo: (id: number) => Promise<ProductoInfoPedidoDto | null>;
  createProduct: (product: ProductDto) => Promise<ProductDto | null>;
  updateProduct: (product: ProductDto) => Promise<ProductDto | null>;
}
