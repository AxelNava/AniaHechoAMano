import { ref } from 'vue'
import { defineStore } from 'pinia'
import { ComponentsApi } from '@/services/products/componentsApi'
import type { ComponenteDto } from '@/types/products/ComponenteDto'

export const useComponentsStore = defineStore('components', () => {
  const components = ref<ComponenteDto[]>([])
  const isLoading = ref(false)
  const isFetched = ref(false)
  const api = new ComponentsApi()

  async function fetchComponents(force = false) {
    if (isFetched.value && !force) return components.value
    
    isLoading.value = true
    try {
      const data = await api.getComponentes()
      components.value = data
      isFetched.value = true
      return data
    } catch (error) {
      console.error('Error fetching components:', error)
      return []
    } finally {
      isLoading.value = false
    }
  }

  function addComponent(component: ComponenteDto) {
    components.value.push(component)
  }

  function updateComponent(id: number, componentData: Partial<ComponenteDto>) {
    const index = components.value.findIndex(c => c.id === id)
    if (index !== -1) {
      components.value[index] = { ...components.value[index], ...componentData }
    }
  }

  return {
    components,
    isLoading,
    isFetched,
    fetchComponents,
    addComponent,
    updateComponent
  }
})
