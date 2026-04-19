import { CategoryDto, CreateCategoryDto } from "@/types/categories/categoryDto";
import { useFetch } from "@/composables/useFetch";

export class CategoriesApi {
  async getCategories(): Promise<CategoryDto[]> {
    const result = await useFetch<CategoryDto[]>("categories");
    if (result) {
      return result;
    }
    return [];
  }

  async createCategories(categories: CreateCategoryDto[]): Promise<boolean> {
    const result = await useFetch<boolean>("categories/new", {
      method: "POST",
      body: JSON.stringify(categories),
    });
    return result || false;
  }
}
