<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { CategoriesApi } from "@/services/categories/categoriesApi";
import { ProductApi } from "@/services/products/productApi";

const router = useRouter();
const route = useRoute();

const categoriesApi = new CategoriesApi();
const productApi = new ProductApi();

const loading = ref(false);
const saving = ref(false);
const error = ref("");
const productId = ref<number>(0);

const product = ref({
  name: "",
  description: "",
  price: 0,
  categoryId: null as number | null,
  activo: true,
});

const categories = ref<{ id: number; nombre: string }[]>([]);

const fetchProduct = async (id: number) => {
  loading.value = true;
  error.value = "";
  try {
    const data = await productApi.getProductById(id);
    if (!data) {
      throw new Error("Producto no encontrado");
    }

    product.value = {
      name: data.nombre,
      description: data.descripcion || "",
      price: Number(data.precio_base),
      categoryId: data.categoria_id,
      activo: data.activo ?? true,
    };
  } catch (_) {
    error.value = "Producto no encontrado";
  } finally {
    loading.value = false;
  }
};

const fetchCategories = async () => {
  try {
    categories.value = await categoriesApi.getCategories();
  } catch (_) {
    console.error("Error fetching categories");
  }
};

const updateProduct = async () => {
  saving.value = true;
  error.value = "";
  try {
    const result = await productApi.updateProduct({
      id: productId.value,
      nombre: product.value.name,
      descripcion: product.value.description,
      precio_base: product.value.price,
      categoria_id: product.value.categoryId as number,
      activo: product.value.activo,
      componentes: [],
    });

    if (!result) {
      throw new Error("Error al actualizar");
    }

    router.push("/admin/products");
  } catch (_) {
    error.value = "Error al actualizar";
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  productId.value = Number(route.params.id);
  fetchCategories();
  fetchProduct(productId.value);
});
</script>

<template>
  <div class="max-w-2xl mx-auto p-6 bg-white rounded shadow mt-10">
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Editar Producto</h1>

    <div v-if="loading" class="text-center py-8 text-gray-500">Cargando...</div>

    <div v-else-if="error && !product.name" class="p-4 bg-red-100 text-red-700 rounded-md">
      {{ error }}
    </div>

    <form v-else @submit.prevent="updateProduct" class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          v-model="product.name"
          required
          class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea
          v-model="product.description"
          rows="3"
          class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Precio Base</label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            step="0.01"
            v-model="product.price"
            required
            class="w-full border border-gray-300 rounded-md p-2 pl-7 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
        <select
          v-model="product.categoryId"
          required
          class="w-full border border-gray-300 rounded-md p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option :value="null" disabled>Seleccionar categoría</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.nombre }}</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          id="activo"
          v-model="product.activo"
          class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <label for="activo" class="text-sm text-gray-700">Producto activo</label>
      </div>

      <div v-if="error" class="p-3 bg-red-100 text-red-700 rounded-md text-sm">
        {{ error }}
      </div>

      <div class="flex justify-end pt-4 gap-3">
        <button
          type="button"
          @click="router.back()"
          class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="bg-blue-600 text-white py-2 px-6 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        >
          {{ saving ? "Guardando..." : "Guardar Cambios" }}
        </button>
      </div>
    </form>
  </div>
</template>
