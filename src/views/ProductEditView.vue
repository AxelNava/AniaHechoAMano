<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { CategoriesApi } from "@/services/categories/categoriesApi";
import { ProductApi } from "@/services/products/productApi";
import ProductImagesManager from "@/components/dashboard/products/ProductImagesManager.vue";
import type { ProductImageItem } from "@/types/products/ProductDto";
import { normalizeProductImages } from "@/composables/products/useProductImages";

const router = useRouter();
const route = useRoute();

const categoriesApi = new CategoriesApi();
const productApi = new ProductApi();

const loading = ref(false);
const saving = ref(false);
const error = ref("");
const productId = ref<number>(0);
const productImages = ref<ProductImageItem[]>([]);
const originalImageIds = ref<number[]>([]);

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
    productImages.value = normalizeProductImages(
      [...(data.imagenes || [])]
        .sort((first, second) => first.orden - second.orden)
        .map((image) => ({
          id: image.id ? String(image.id) : image.url,
          previewUrl: image.url,
          existingUrl: image.url,
          alt: image.alt,
          orden: image.orden,
          isPrimary: image.orden === 0,
        })),
    );
    originalImageIds.value = (data.imagenes || [])
      .map((image) => image.id)
      .filter((id): id is number => typeof id === "number");
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
    const formData = new FormData();
    formData.append("nombre", product.value.name);
    formData.append("descripcion", product.value.description);
    formData.append("precio_base", String(product.value.price));
    formData.append("categoria_id", String(product.value.categoryId));
    formData.append("activo", String(product.value.activo));
    formData.append("componentes", JSON.stringify([]));

    const existingImages = productImages.value
      .filter((image) => image.existingUrl && !image.file)
      .map((image, index) => ({
        id: Number.isNaN(Number(image.id)) ? undefined : Number(image.id),
        url: image.existingUrl,
        alt: image.alt,
        orden: index,
      }));
    const currentExistingIds = new Set(existingImages.map((image) => image.id).filter(Boolean));
    const deletedImageIds = originalImageIds.value.filter((id) => !currentExistingIds.has(id));

    formData.append("imagenes_existentes", JSON.stringify(existingImages));
    deletedImageIds.forEach((id) => {
      formData.append("imagenes_eliminadas", String(id));
    });

    productImages.value.forEach((image, index) => {
      if (image.file) {
        formData.append("imagenes", image.file);
        formData.append("imagenes_orden", String(index));
      }
    });

    const result = await productApi.updateProductWithImages(productId.value, formData);

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
  <div class="mx-auto mt-10 max-w-7xl p-6">
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Editar Producto</h1>

    <div v-if="loading" class="text-center py-8 text-gray-500">Cargando...</div>

    <div v-else-if="error && !product.name" class="p-4 bg-red-100 text-red-700 rounded-md">
      {{ error }}
    </div>

    <form v-else @submit.prevent="updateProduct" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <div class="space-y-6 rounded-xl bg-white p-6 shadow">
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
      </div>

      <aside class="lg:sticky lg:top-6 lg:self-start">
        <ProductImagesManager v-model="productImages" :disabled="saving" />
      </aside>
    </form>
  </div>
</template>
