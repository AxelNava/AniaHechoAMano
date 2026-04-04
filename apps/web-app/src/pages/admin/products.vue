<script setup lang="ts">
import { ref } from 'vue'

const product = ref({
  name: '',
  description: '',
  price: 0,
  category: '',
  images: [] as File[],
})

const categories = ref([
  // Dummy categories para empezar, después se pueden cargar de la API
  { id: 1, name: 'Amigurumis' },
  { id: 2, name: 'Llaveros' },
  { id: 3, name: 'Personalizados' },
])

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    product.value.images = Array.from(target.files)
  }
}

const submitForm = async () => {
  // TODO: Conectar con el backend usando fetch o axios (con Bun como entorno en el backend)
  console.log('Registrando producto:', product.value)
  alert('Producto registrado (simulación)')
}
</script>

<template>
  <div class="admin-products-container max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
    <h1 class="text-2xl font-bold mb-6">Administración de Productos</h1>
    
    <form @submit.prevent="submitForm" class="space-y-4">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">Nombre del Producto</label>
        <input 
          id="name" 
          v-model="product.name" 
          type="text" 
          required 
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" 
          placeholder="Ej: Amigurumi Osito"
        />
      </div>

      <div>
        <label for="description" class="block text-sm font-medium text-gray-700">Descripción</label>
        <textarea 
          id="description" 
          v-model="product.description" 
          rows="3" 
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" 
          placeholder="Descripción detallada del producto"
        ></textarea>
      </div>

      <div>
        <label for="price" class="block text-sm font-medium text-gray-700">Precio</label>
        <input 
          id="price" 
          v-model="product.price" 
          type="number" 
          min="0"
          step="0.01"
          required 
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" 
        />
      </div>

      <div>
        <label for="category" class="block text-sm font-medium text-gray-700">Categoría</label>
        <select 
          id="category" 
          v-model="product.category" 
          required 
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        >
          <option value="" disabled>Seleccione una categoría</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <div>
        <label for="images" class="block text-sm font-medium text-gray-700">Imágenes (opcional)</label>
        <input 
          id="images" 
          type="file" 
          multiple 
          accept="image/*"
          @change="handleFileUpload" 
          class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
        />
      </div>

      <div class="pt-4">
        <button 
          type="submit" 
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Registrar Producto
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
/* Estilos específicos si son necesarios (Tailwind se asume por las clases usadas) */
</style>