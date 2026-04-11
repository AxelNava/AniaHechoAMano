<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { mockApi } from "@/services/mockApi";
import ListProductsFilter from "@/components/dashboard/list-products-filter.vue";

const router = useRouter();

const products = ref<any[]>([]);
const categories = ref<Array<{ id: number; nombre: string }>>([]);
const loading = ref(true);

const fetchProducts = async () => {
  try {
    products.value = await mockApi.getProducts();
  } catch (error) {
    console.error("Error fetching products:", error);
  }
};

const fetchCategories = async () => {
  try {
    categories.value = await mockApi.getCategories();
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
};

onMounted(() => {
  fetchCategories();
  fetchProducts();
  loading.value = false;
});
</script>

<template>
  <section>
    <span>Filtros</span>
    <list-products-filter />
  </section>
  <div v-if="loading" class="text-center py-8 text-gray-500">Cargando productos...</div>
  <div v-else>
    <section v-if="products.length > 0" class="bg-white rounded-lg shadow mb-8">
      <section class="px-4 py-3 border-b bg-gray-50">
        <h2 class="font-semibold text-gray-700">Lista de Productos</h2>
      </section>
      <article class="divide-y">
        <div
          v-for="prod in products"
          :key="prod.id"
          class="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-gray-50"
        >
          <div class="flex-1 min-w-50">
            <p class="font-medium text-gray-800">{{ prod.nombre }}</p>
            <p class="text-sm text-gray-500">{{ prod.descripcion || "Sin descripción" }}</p>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium text-green-600">${{ prod.precio_base }}</span>
            <span
              :class="[
                'px-2 py-1 rounded-full text-xs',
                prod.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600',
              ]"
            >
              {{ prod.activo ? "Activo" : "Inactivo" }}
            </span>
            <div class="flex gap-2">
              <button
                @click="router.push(`/admin/products/edit/${prod.id}`)"
                class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Editar
              </button>
              <button
                @click="router.push(`/admin/products/${prod.id}/orders`)"
                class="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              >
                Historial
              </button>
            </div>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped></style>
