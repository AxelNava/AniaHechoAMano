<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { mockApi } from "@/services/mockApi";
import { ProductApi } from "@/services/products/productApi";
import "vue-sonner/style.css";
import { toast } from "vue-sonner";

const router = useRouter();

const product = ref({
  name: "",
  description: "",
  price: 0,
  categoryId: null as number | null,
  images: [] as File[],
});
const productApi = new ProductApi();

const categories = ref<{ id: number; nombre: string }[]>([]);
const newCategoryName = ref("");
const loading = ref(false);
const error = ref("");

const fetchCategories = async () => {
  try {
    categories.value = await mockApi.getCategories();
  } catch (e) {
    console.error(e);
  }
};

const createNewCategory = async () => {
  if (!newCategoryName.value) return null;
  try {
    const newCategory = await mockApi.createCategory(newCategoryName.value);
    categories.value.push(newCategory);
    product.value.categoryId = newCategory.id;
    newCategoryName.value = "";
    return newCategory.id;
  } catch (e) {
    toast.error("Error al crear categoría");
    console.error(e);
  }
  return null;
};

const submitProduct = async () => {
  loading.value = true;
  error.value = "";

  try {
    let catId = product.value.categoryId;

    if (!catId && newCategoryName.value) {
      catId = await createNewCategory();
    }

    if (!catId) {
      error.value = "Please select or create a category";
      loading.value = false;
      return;
    }

    const result = await productApi.createProduct({
      nombre: product.value.name,
      descripcion: product.value.description,
      precio_base: Number(product.value.price),
      categoria_id: catId,
      activo: true,
      componentes: [{ componente_id: 1, cantidad: 10 }],
    });
    if (result) {
      await router.push("/admin/products");
    } else {
      error.value = "Failed to create product";
    }
  } catch (_) {
    toast.error("Error al crear producto");
    error.value = "Failed to create product";
  } finally {
    loading.value = false;
  }
};

onMounted(fetchCategories);
</script>

<template>
  <div class="max-w-2xl mx-auto p-6 bg-white rounded shadow mt-10">
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Crear nuevo producto</h1>

    <form @submit.prevent="submitProduct" class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          v-model="product.name"
          required
          class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Nombre del producto"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea
          v-model="product.description"
          rows="3"
          class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Descripción del producto"
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Precio</label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            step="0.01"
            v-model="product.price"
            required
            class="w-full border border-gray-300 rounded-md p-2 pl-7 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="0.00"
          />
        </div>
      </div>

      <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <label class="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
        <select
          v-model="product.categoryId"
          class="w-full border border-gray-300 rounded-md p-2 mb-3 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option :value="null" disabled>Selecciona una categoría</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.nombre }}</option>
        </select>

        <div class="flex items-center gap-2 mt-2">
          <div class="grow h-px bg-gray-300"></div>
          <span class="text-xs text-gray-500 font-medium">O crear nueva</span>
          <div class="grow h-px bg-gray-300"></div>
        </div>

        <div class="flex gap-2 mt-3">
          <input
            v-model="newCategoryName"
            placeholder="Nombre de la nueva categoría"
            class="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="button"
            @click="createNewCategory"
            class="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded hover:bg-gray-300 transition-colors cursor-pointer"
          >
            Agregar
          </button>
        </div>
      </div>

      <div
        v-if="error"
        class="p-3 bg-red-100 text-red-700 rounded-md text-sm border border-red-200"
      >
        {{ error }}
      </div>

      <div class="flex justify-end pt-4">
        <button
          type="button"
          @click="router.back()"
          class="mr-3 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="loading"
          class="bg-blue-600 text-white py-2 px-6 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        >
          {{ loading ? "Guardando..." : "Crear producto" }}
        </button>
      </div>
    </form>
  </div>
</template>

<!--
<form @submit.prevent="submitform" class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">
            nombre del producto
          </label>
          <input
            id="name"
            v-model="product.name"
            type="text"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="ej: amigurumi osito"
          />
        </div>

        <div>
          <label for="description" class="block text-sm font-medium text-gray-700"
            >descripción</label
          >
          <textarea
            id="description"
            v-model="product.description"
            rows="3"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="descripción detallada del producto"
          ></textarea>
        </div>

        <div>
          <label for="price" class="block text-sm font-medium text-gray-700">precio</label>
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
          <label for="category" class="block text-sm font-medium text-gray-700">categoría</label>
          <select
            id="category"
            v-model="product.categoryid"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          >
            <option value="" disabled>seleccione una categoría</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.nombre }}
            </option>
          </select>
        </div>

        <div>
          <label for="images" class="block text-sm font-medium text-gray-700">
            imágenes (opcional)
          </label>
          <input
            id="images"
            type="file"
            multiple
            accept="image/*"
            @change="handlefileupload"
            class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>
      </form>
-->
