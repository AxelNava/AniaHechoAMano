import { ref } from 'vue'
import { defineStore } from 'pinia'
import { CategoriesApi } from '@/services/categories/categoriesApi'
import type { CategoryDto } from '@/types/categories/categoryDto'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<CategoryDto[]>([])
  const isLoading = ref(false)
  const isFetched = ref(false)
  const api = new CategoriesApi()

  async function fetchCategories(force = false) {
    if (isFetched.value && !force) return categories.value
    
    isLoading.value = true
    try {
      const data = await api.getCategories()
      categories.value = data
      isFetched.value = true
      return data
    } catch (error) {
      console.error('Error fetching categories:', error)
      return []
    } finally {
      isLoading.value = false
    }
  }

  function addCategory(category: CategoryDto) {
    categories.value.push(category)
  }

  return {
    categories,
    isLoading,
    isFetched,
    fetchCategories,
    addCategory
  }
})
