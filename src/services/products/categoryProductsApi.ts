import { CategoryDto } from "@/types/categories/categoryDto";
import { useFetch } from "@/composables/useFetch";

export class CategoryProductsApi {
  async getCategories(): Promise<CategoryDto[]> {
    const result = await useFetch<CategoryDto[]>("products/categories");
    if (result) {
      return result;
    }
    return [{ id: 0, nombre: "" }];
  }
}
