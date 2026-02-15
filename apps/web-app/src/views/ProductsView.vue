<script setup lang="ts">
import ProductLayout from '@/layouts/ProductLayout.vue'
import ProductCard from '@/components/ProductCard.vue'
import { products } from '@/data/products'
import Heading1 from '@/components/base/Heading1.vue'
</script>

<template>
  <ProductLayout>
    <section class="py-8">
      <Heading1 class-name="text-text-page mb-4">Catálogo de Productos Monty Python</Heading1>
      <p class="text-center text-text-page2 mb-12 max-w-2xl mx-auto text-lg">
        Explore nuestra colección exclusiva de objetos absurdos y situaciones cómicas.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :title="product.title"
          :tags="product.tags"
          :image-src="product.images[0]"
          :url-target="`/detalles/${product.tags.CATEGORY?.toLowerCase() || 'general'}/${product.id}`"
          :style="{ viewTransitionName: 'product-card-' + product.id }"
        >
          {{ product.description.substring(0, 100) }}...
        </ProductCard>
      </div>
    </section>
  </ProductLayout>
</template>

<style scoped>
/* Las transiciones de vista se manejan mediante estilos en línea para ser únicos */
</style>
