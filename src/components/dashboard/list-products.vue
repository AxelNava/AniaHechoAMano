<script setup lang="ts">
import { computed, ref, onMounted, watch } from "vue";
import ListProductsFilter from "@/components/dashboard/list-products-filter.vue";
import { DataTable, DataTableColumn, type DataTableSort } from "@/components/ui";
import ProductActionsCell from "@/components/dashboard/product-table-cells/ProductActionsCell.vue";
import ProductNameCell from "@/components/dashboard/product-table-cells/ProductNameCell.vue";
import ProductPriceCell from "@/components/dashboard/product-table-cells/ProductPriceCell.vue";
import ProductStatusCell from "@/components/dashboard/product-table-cells/ProductStatusCell.vue";
import { ProductApi } from "@/services/products/productApi";
import { CategoriesApi } from "@/services/categories/categoriesApi";
import { ProductDto } from "@/types/products/ProductDto";
import type { ProductListQueryDto } from "@/types/orders/orderHistoryDto";

type ProductFilters = Pick<ProductListQueryDto, "search" | "categoria_id" | "activo">;

const products = ref<ProductDto[]>([]);
const categories = ref<Array<{ id: number; nombre: string }>>([]);
const loading = ref(true);
const refreshing = ref(false);
const searching = ref(false);
const activeFilters = ref<ProductFilters>({});
const sort = ref<DataTableSort | null>(null);
const productApi = new ProductApi();
const categoriesApi = new CategoriesApi();

const sortQuery = computed(() =>
  sort.value ? `${sort.value.key}:${sort.value.direction}` : undefined,
);

const fetchProducts = async () => {
  try {
    const response = await productApi.getProductsPaginated({
      page: 1,
      limit: 50,
      ...activeFilters.value,
      sort: sortQuery.value,
    });
    products.value = response.data;
  } catch (error) {
    products.value = [];
    console.error("Error fetching products:", error);
  }
};

watch(sort, async () => {
  searching.value = true;
  try {
    await fetchProducts();
  } finally {
    searching.value = false;
  }
});

const handleSearch = async (filters: ProductFilters) => {
  activeFilters.value = filters;
  searching.value = true;
  try {
    await fetchProducts();
  } finally {
    searching.value = false;
  }
};

const fetchCategories = async () => {
  try {
    categories.value = await categoriesApi.getCategories();
  } catch (error) {
    categories.value = [];
    console.error("Error fetching categories:", error);
  }
};

const refreshTable = async () => {
  try {
    refreshing.value = true;
    await Promise.all([fetchCategories(), fetchProducts()]);
  } finally {
    refreshing.value = false;
  }
};

onMounted(async () => {
  try {
    await Promise.all([fetchCategories(), fetchProducts()]);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <ListProductsFilter :categories="categories" :loading="searching" @search="handleSearch" />
  <div v-if="loading" class="text-center py-8 text-gray-500">Cargando productos...</div>
  <div v-else>
    <section class="bg-white rounded-lg shadow mb-8">
      <section class="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-3">
        <h2 class="font-semibold text-gray-700">Lista de Productos</h2>
        <router-link
          to="/admin/products/new"
          class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          style="view-transition-name: add-product-cta"
        >
          Añadir producto
        </router-link>
      </section>
      <DataTable
        :rows="products"
        :row-key="(row) => row.id"
        v-model:sort="sort"
        empty-message="No hay dato"
      >
        <template #toolbar>
          <button
            type="button"
            :disabled="refreshing"
            @click="refreshTable"
            class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ refreshing ? "Actualizando..." : "Actualizar" }}
          </button>
        </template>

        <DataTableColumn
          label="Producto"
          prop="nombre"
          cell-class="min-w-72"
          :cell-component="ProductNameCell"
        />
        <DataTableColumn
          label="Precio"
          prop="precio_base"
          header-class="text-right"
          cell-class="text-right"
          sortable
          sort-key="precio_base"
          sort-asc-label="menor a mayor"
          sort-desc-label="mayor a menor"
          :cell-component="ProductPriceCell"
        />
        <DataTableColumn label="Estado" prop="activo" :cell-component="ProductStatusCell" />
        <DataTableColumn
          label="Acciones"
          :accessor="(row) => row.id"
          header-class="text-right"
          cell-class="text-right"
          :cell-component="ProductActionsCell"
        />
      </DataTable>
    </section>
  </div>
</template>

<style scoped></style>
