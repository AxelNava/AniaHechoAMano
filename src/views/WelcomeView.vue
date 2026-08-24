<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
import PrimaryLogo from "@/components/PrimaryLogo.vue";
import SecondaryButton from "@/components/base/SecondaryButton.vue";
import ProductCard from "@/components/ProductCard.vue";
import defaultProductImage from "@/assets/images/default-product.jpg";
import { catalogApi } from "@/services/products/catalogApi";
import { resolveProductBinaryUrl } from "@/services/products/productApi";
import { catalogConfig } from "@/config/catalog";
import type { CatalogProductDto } from "@/types/products/catalogProductDto";

const products = ref<CatalogProductDto[]>([]);
const isLoading = ref(true);
const hasLoadError = ref(false);

const normalizeCategory = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const categorySlugFor = (categoryName: string) => {
  const normalizedCategory = normalizeCategory(categoryName);

  return Object.values(catalogConfig).find((config) =>
    config.categorias.some((category) => normalizeCategory(category) === normalizedCategory),
  )?.slug;
};

const featuredProducts = computed(() =>
  products.value.filter((product) => categorySlugFor(product.categoria)).slice(0, 6),
);

const productTags = (product: CatalogProductDto): Record<string, string> => {
  const tags: Record<string, string> = {};

  if (product.categoria) {
    tags.CATEGORIA = product.categoria;
  }

  product.tags_por_producto.forEach((tag, index) => {
    tags[`TAG_${index}`] = tag;
  });

  return tags;
};

const productImage = (product: CatalogProductDto) => {
  const cover = product.imagenes?.find((image) => image.es_portada) ?? product.imagenes?.[0];

  return cover?.binario_url ? resolveProductBinaryUrl(cover.binario_url) : defaultProductImage;
};

const productDescription = (product: CatalogProductDto) => {
  const description = product.descripcion?.trim() ?? "";

  if (!description) {
    return "Creación artesanal hecha con dedicación y amor al detalle.";
  }

  return description.length > 120 ? `${description.slice(0, 120)}...` : description;
};

const productUrl = (product: CatalogProductDto) => {
  const slug = categorySlugFor(product.categoria);

  return slug ? `/categoria/${slug}/producto/${product.id}` : "/categoria/adornos-de-fiesta";
};

const loadFeaturedProducts = async () => {
  try {
    const response = await catalogApi.getCatalogProducts({ limit: 6, page: 1 });
    products.value = response.data;
  } catch {
    hasLoadError.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  void loadFeaturedProducts();
});
</script>

<template>
  <div class="grid min-h-screen grid-rows-[auto_1fr_auto] overflow-x-clip bg-background text-foreground">
    <AppHeader />

    <main>
      <section
        class="bg-primary px-4 py-16 text-center sm:px-6 sm:py-20 lg:py-24"
        aria-labelledby="welcome-title"
      >
        <div class="mx-auto flex max-w-4xl flex-col items-center">
          <h1 id="welcome-title" class="sr-only">Ania Hecho a Mano</h1>
          <div class="hero-logo w-full max-w-[34rem]" aria-hidden="true">
            <PrimaryLogo :is-main-title="true" />
          </div>
          <p
            class="mt-8 max-w-[48ch] text-pretty text-lg leading-8 text-text-page2 sm:text-xl sm:leading-9"
          >
            Creaciones únicas y personalizadas para hacer de tus momentos especiales algo
            inolvidable. Cada pieza está hecha con amor y dedicación.
          </p>
          <div
            class="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4"
          >
            <SecondaryButton
              url="#productos"
              :selected="true"
              class="focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-text-page/30"
            >
              Ver productos
            </SecondaryButton>
            <SecondaryButton
              url="#contacto"
              class="focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-text-page/30"
            >
              Contactar
            </SecondaryButton>
          </div>
        </div>
      </section>

      <section
        id="productos"
        class="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
        aria-labelledby="products-title"
        :aria-busy="isLoading"
      >
        <div class="mx-auto max-w-7xl">
          <div class="mx-auto max-w-2xl text-center">
            <h2 id="products-title" class="font-dancing text-4xl text-text-page sm:text-5xl">
              Nuestros productos
            </h2>
            <p class="mt-4 text-pretty text-lg leading-8 text-text-page2">
              Descubre nuestra colección de creaciones artesanales, cada una hecha con dedicación y
              amor al detalle.
            </p>
          </div>

          <div
            v-if="isLoading"
            class="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
            aria-hidden="true"
          >
            <div
              v-for="index in 3"
              :key="index"
              class="motion-safe:animate-pulse overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div class="aspect-video bg-primary/70" />
              <div class="space-y-3 p-6">
                <div class="h-6 w-3/4 rounded bg-primary/70" />
                <div class="h-4 w-full rounded bg-muted" />
                <div class="h-4 w-2/3 rounded bg-muted" />
                <div class="flex gap-2 pt-2">
                  <div class="h-8 w-24 rounded-full bg-primary/70" />
                  <div class="h-8 w-20 rounded-full bg-primary/70" />
                </div>
              </div>
            </div>
          </div>

          <div
            v-else-if="featuredProducts.length > 0"
            class="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            <ProductCard
              v-for="product in featuredProducts"
              :key="product.id"
              :title="product.nombre"
              :tags="productTags(product)"
              :image-src="productImage(product)"
              :url-target="productUrl(product)"
              class-name="h-full"
              :aria-label="`Ver detalles de ${product.nombre}`"
            >
              {{ productDescription(product) }}
            </ProductCard>
          </div>

          <div
            v-else
            class="mt-12 flex flex-col items-center rounded-2xl bg-primary/45 px-6 py-12 text-center"
            role="status"
            aria-live="polite"
          >
            <p class="text-xl font-medium text-text-page">
              {{
                hasLoadError
                  ? "No pudimos cargar los productos."
                  : "No hay productos para mostrar todavía."
              }}
            </p>
            <p class="mt-2 max-w-md text-text-page2">
              Explorá nuestras categorías y encontrá una idea para tu próximo momento especial.
            </p>
            <SecondaryButton
              url="/categoria/adornos-de-fiesta"
              class="mt-6 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-text-page/30"
            >
              Explorar categorías
            </SecondaryButton>
          </div>
        </div>
      </section>
    </main>

    <div id="contacto" class="scroll-mt-24">
      <AppFooter />
    </div>
  </div>
</template>

<style scoped>
.hero-logo :deep(.animated-logo) {
  display: block;
  width: 100%;
  height: auto;
}
</style>
