<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import ProductLayout from "@/layouts/ProductLayout.vue";
import ProductCard from "@/components/ProductCard.vue";
import Heading1 from "@/components/base/Heading1.vue";
import { getCatalogConfig } from "@/config/catalog";
import { CategoriesApi } from "@/services/categories/categoriesApi";
import { catalogApi } from "@/services/products/catalogApi";
import { resolveProductBinaryUrl } from "@/services/products/productApi";
import defaultProductImage from "@/assets/images/default-product.jpg";
import type { CatalogProductDto } from "@/types/products/catalogProductDto";
import type { CategoryDto } from "@/types/categories/categoryDto";

type SortOption = "precio_base:asc" | "precio_base:desc" | null;

const route = useRoute();
const categoriesApi = new CategoriesApi();

const slug = computed(() => String(route.params.slug ?? ""));
const config = computed(() => getCatalogConfig(slug.value));

const products = ref<CatalogProductDto[]>([]);
const resolvedCategories = ref<CategoryDto[]>([]);
const selectedCategoryIds = ref<number[]>([]);
const search = ref("");
const sort = ref<SortOption>(null);
// Inicia en true: siempre cargamos al montar, así no parpadea el estado vacío.
const isLoading = ref(true);

const hasMultipleCategories = computed(() => resolvedCategories.value.length > 1);
const allCategoryIds = computed(() => resolvedCategories.value.map((c) => c.id));

const activeCategoryIds = computed(() =>
  selectedCategoryIds.value.length > 0 ? selectedCategoryIds.value : allCategoryIds.value,
);

const normalize = (value: string) => value.trim().toLowerCase();

const buildTags = (product: CatalogProductDto): Record<string, string> => {
  const tags: Record<string, string> = {};
  if (product.categoria) {
    tags.CATEGORIA = product.categoria;
  }
  product.tags_por_producto.forEach((tag, index) => {
    tags[`TAG_${index}`] = tag;
  });
  return tags;
};

const coverImage = (product: CatalogProductDto): string => {
  const cover =
    product.imagenes?.find((image) => image.es_portada) ?? product.imagenes?.[0] ?? null;
  // Usamos `binario_url` (el endpoint que sirve el archivo a través de la API)
  // en lugar de `url`: este último apunta al almacenamiento local temporal
  // (`/uploads/...`) y no siempre muestra la imagen principal real.
  // Si el producto no tiene imagen, usamos un placeholder en lugar de un src
  // vacío (un <img src=""> es inválido y se ve roto en el navegador).
  return cover ? resolveProductBinaryUrl(cover.binario_url) : defaultProductImage;
};

const description = (product: CatalogProductDto): string => {
  const text = product.descripcion?.trim() ?? "";
  if (!text) {
    return "Creación artesanal hecha con dedicación y amor al detalle.";
  }
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
};

const resolveCategories = async () => {
  const current = config.value;
  if (!current) {
    resolvedCategories.value = [];
    return;
  }

  const allCategories = await categoriesApi.getCategories();
  const wanted = current.categorias.map(normalize);
  resolvedCategories.value = allCategories.filter((category) =>
    wanted.includes(normalize(category.nombre)),
  );
  // Solo reasignamos si hay algo que limpiar; asignar [] cuando ya está vacío
  // crea una nueva referencia y dispararía un fetch duplicado por el watcher.
  if (selectedCategoryIds.value.length > 0) {
    selectedCategoryIds.value = [];
  }
};

const fetchProducts = async () => {
  // Sin configuración válida o sin categorías que resolver no hay nada que pedir;
  // cerramos la carga para mostrar el estado vacío en lugar de un spinner eterno.
  if (!config.value || allCategoryIds.value.length === 0) {
    products.value = [];
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  try {
    const response = await catalogApi.getCatalogProducts({
      categoria_ids: activeCategoryIds.value,
      search: search.value.trim() || undefined,
      sort: sort.value ?? undefined,
      limit: 100,
      page: 1,
    });
    products.value = response.data;
  } finally {
    isLoading.value = false;
  }
};

const toggleCategory = (id: number) => {
  if (selectedCategoryIds.value.includes(id)) {
    selectedCategoryIds.value = selectedCategoryIds.value.filter((item) => item !== id);
  } else {
    selectedCategoryIds.value = [...selectedCategoryIds.value, id];
  }
};

const clearCategoryFilter = () => {
  selectedCategoryIds.value = [];
};

const setSort = (option: SortOption) => {
  sort.value = sort.value === option ? null : option;
};

// Refresca el listado cuando cambia la categoría de la ruta.
watch(
  slug,
  async () => {
    isLoading.value = true;
    search.value = "";
    sort.value = null;
    await resolveCategories();
    await fetchProducts();
  },
  { immediate: true },
);

// Refresca al cambiar filtros de subcategoría u ordenamiento.
watch([selectedCategoryIds, sort], () => {
  void fetchProducts();
});

// Búsqueda con debounce para no consultar en cada tecla.
let searchTimeout: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    void fetchProducts();
  }, 300);
});
</script>

<template>
  <ProductLayout>
    <section v-if="config" class="py-8">
      <Heading1 class-name="text-text-page mb-4">{{ config.titulo }}</Heading1>
      <p
        v-if="config.descripcion"
        class="text-center text-text-page2 mb-10 max-w-2xl mx-auto text-lg"
      >
        {{ config.descripcion }}
      </p>

      <!-- Barra de herramientas: búsqueda y ordenamiento -->
      <div class="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">
        <div class="relative w-full md:max-w-sm">
          <input
            v-model="search"
            type="search"
            placeholder="Buscar producto por nombre..."
            class="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-3 text-text-page focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div class="grid grid-cols-2 gap-2 md:flex md:gap-2 md:shrink-0">
          <button
            type="button"
            class="flex items-center justify-center gap-1 rounded-2xl border-2 px-3 py-2.5 text-sm font-medium leading-tight transition-colors"
            :class="
              sort === 'precio_base:asc'
                ? 'bg-text-page border-text-page text-white'
                : 'bg-white dark:bg-gray-900 border-text-page text-text-page hover:bg-text-page hover:text-white'
            "
            :aria-pressed="sort === 'precio_base:asc'"
            @click="setSort('precio_base:asc')"
          >
            <span aria-hidden="true">↑</span>
            <span>Menor precio</span>
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-1 rounded-2xl border-2 px-3 py-2.5 text-sm font-medium leading-tight transition-colors"
            :class="
              sort === 'precio_base:desc'
                ? 'bg-text-page border-text-page text-white'
                : 'bg-white dark:bg-gray-900 border-text-page text-text-page hover:bg-text-page hover:text-white'
            "
            :aria-pressed="sort === 'precio_base:desc'"
            @click="setSort('precio_base:desc')"
          >
            <span aria-hidden="true">↓</span>
            <span>Mayor precio</span>
          </button>
        </div>
      </div>

      <!-- Filtros por subcategoría (solo cuando hay varias) -->
      <div v-if="hasMultipleCategories" class="flex flex-wrap gap-2 mb-10">
        <button
          type="button"
          class="rounded-2xl px-5 py-2 text-sm font-medium transition-colors"
          :class="
            selectedCategoryIds.length === 0
              ? 'bg-primary text-text-page'
              : 'bg-gray-100 dark:bg-gray-800 text-text-page2 hover:bg-primary/60'
          "
          @click="clearCategoryFilter"
        >
          Todas
        </button>
        <button
          v-for="category in resolvedCategories"
          :key="category.id"
          type="button"
          class="rounded-2xl px-5 py-2 text-sm font-medium transition-colors"
          :class="
            selectedCategoryIds.includes(category.id)
              ? 'bg-primary text-text-page'
              : 'bg-gray-100 dark:bg-gray-800 text-text-page2 hover:bg-primary/60'
          "
          @click="toggleCategory(category.id)"
        >
          {{ category.nombre }}
        </button>
      </div>

      <!-- Área de productos: la rejilla, el estado vacío y el overlay de carga
           conviven aquí para que la capa de carga cubra todo el bloque y el
           usuario nunca vea una lista a medio cargar. -->
      <div class="relative min-h-[24rem]">
        <!-- Rejilla de productos -->
        <div
          v-if="products.length > 0"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
        >
          <ProductCard
            v-for="product in products"
            :key="product.id"
            :title="product.nombre"
            :tags="buildTags(product)"
            :image-src="coverImage(product)"
            :url-target="`/categoria/${slug}/producto/${product.id}`"
            class-name="row-span-2"
            :style="{ viewTransitionName: 'product-card-' + product.id }"
          >
            {{ description(product) }}
          </ProductCard>
        </div>

        <!-- Estado vacío: solo cuando terminó de cargar y no hay resultados -->
        <div
          v-else-if="!isLoading"
          class="flex flex-col items-center justify-center gap-2 py-20 text-center"
        >
          <p class="text-text-page text-xl font-medium">Sin resultados</p>
          <p class="text-text-page2 text-base max-w-md">
            No encontramos productos para tu búsqueda. Intenta con otro término
            o quita los filtros.
          </p>
        </div>

        <!-- Overlay de carga: cubre toda el área de productos -->
        <div
          v-if="isLoading"
          class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <span
            class="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"
            aria-hidden="true"
          />
          <p class="text-text-page font-medium">Cargando productos...</p>
        </div>
      </div>
    </section>

    <!-- Slug desconocido -->
    <section v-else class="py-24 text-center">
      <Heading1 class-name="text-text-page mb-4">Categoría no encontrada</Heading1>
      <p class="text-text-page2 text-lg">
        La categoría que buscas no existe o fue movida.
      </p>
    </section>
  </ProductLayout>
</template>
