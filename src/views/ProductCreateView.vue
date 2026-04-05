<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const product = ref({
  name: '',
  description: '',
  price: 0,
  categoryId: null as number | null
})

const categories = ref<{ id: number; name: string }[]>([])
const newCategoryName = ref('')
const loading = ref(false)
const error = ref('')

const fetchCategories = async () => {
  try {
    const res = await fetch('http://localhost:3000/categories')
    if (res.ok) {
      categories.value = await res.json()
    }
  } catch (e) {
    console.error(e)
  }
}

const createNewCategory = async () => {
  if (!newCategoryName.value) return null
  try {
    const res = await fetch('http://localhost:3000/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName.value })
    })
    if (res.ok) {
      const newCategory = await res.json()
      categories.value.push(newCategory)
      product.value.categoryId = newCategory.id // Auto select
      newCategoryName.value = ''
      return newCategory.id
    }
  } catch (e) {
    console.error(e)
  }
  return null
}

const submitProduct = async () => {
  loading.value = true
  error.value = ''

  try {
    let catId = product.value.categoryId

    // If "New Category" is typed but not added via button, try adding it now
    if (!catId && newCategoryName.value) {
      catId = await createNewCategory()
    }

    if (!catId) {
      error.value = 'Please select or create a category'
      loading.value = false
      return
    }

    const res = await fetch('http://localhost:3000/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...product.value,
        categoryId: catId,
        price: Number(product.value.price) // Ensure number
      })
    })

    if (res.ok) {
      router.push('/products') // Redirect after success
    } else {
      const data = await res.json()
      error.value = data.message || 'Failed to create product'
    }
  } catch (e) {
    error.value = 'Network error'
  } finally {
    loading.value = false
  }
}

onMounted(fetchCategories)
</script>

<template>
  <div class="max-w-2xl mx-auto p-6 bg-white rounded shadow mt-10">
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Create New Product</h1>

    <form @submit.prevent="submitProduct" class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input v-model="product.name" required class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Product Name" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea v-model="product.description" rows="3" class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Product Description"></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Price</label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input type="number" step="0.01" v-model="product.price" required class="w-full border border-gray-300 rounded-md p-2 pl-7 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="0.00" />
        </div>
      </div>

      <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <select v-model="product.categoryId" class="w-full border border-gray-300 rounded-md p-2 mb-3 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option :value="null" disabled>Select a category</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>

        <div class="flex items-center gap-2 mt-2">
          <div class="flex-grow h-px bg-gray-300"></div>
          <span class="text-xs text-gray-500 font-medium">OR CREATE NEW</span>
          <div class="flex-grow h-px bg-gray-300"></div>
        </div>

        <div class="flex gap-2 mt-3">
          <input v-model="newCategoryName" placeholder="New Category Name" class="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          <button type="button" @click="createNewCategory" class="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded hover:bg-gray-300 transition-colors cursor-pointer">
            Add
          </button>
        </div>
      </div>

      <div v-if="error" class="p-3 bg-red-100 text-red-700 rounded-md text-sm border border-red-200">
        {{ error }}
      </div>

      <div class="flex justify-end pt-4">
        <button type="button" @click="router.back()" class="mr-3 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium cursor-pointer">
          Cancel
        </button>
        <button type="submit" :disabled="loading" class="bg-blue-600 text-white py-2 px-6 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm">
          {{ loading ? 'Saving...' : 'Create Product' }}
        </button>
      </div>
    </form>
  </div>
</template>
