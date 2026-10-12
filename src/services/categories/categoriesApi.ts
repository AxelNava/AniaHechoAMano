import { CategoryDto, CreateCategoryDto } from "@/types/categories/categoryDto";
import { useFetch } from "@/composables/useFetch";

export class CategoriesApi {
  async getCategories(): Promise<CategoryDto[]> {
    const result = await useFetch<CategoryDto[]>("categories", { method: "GET", auth: "none" });
    if (result) {
      return result;
    }
    return [];
  }

  async createCategories(categories: CreateCategoryDto[]): Promise<boolean> {
    const result = await useFetch<boolean>("categories/new", {
      method: "POST",
      auth: "required",
      body: JSON.stringify(categories),
    });
    return result || false;
  }
}
