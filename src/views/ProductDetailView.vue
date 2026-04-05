<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, ref, watch } from 'vue'
import ProductLayout from '@/layouts/ProductLayout.vue'
import { products } from '@/data/products'
import Heading1 from '@/components/base/Heading1.vue'

const route = useRoute()
const router = useRouter()

const product = computed(() => {
  const productId = route.params.id as string
  const category = route.params.category as string
  return products.find(
    (p) => p.id === productId && p.tags.CATEGORY?.toLowerCase() === category,
  )
})

const currentImageIndex = ref(0)
const slideDirection = ref('slide-next')

watch(product, () => {
  currentImageIndex.value = 0
})

const nextImage = () => {
  if (product.value) {
    slideDirection.value = 'slide-next'
    currentImageIndex.value = (currentImageIndex.value + 1) % product.value.images.length
  }
}

const prevImage = () => {
  if (product.value) {
    slideDirection.value = 'slide-prev'
    currentImageIndex.value =
      (currentImageIndex.value - 1 + product.value.images.length) % product.value.images.length
  }
}

const selectImage = (index: number) => {
  if (index > currentImageIndex.value) {
    slideDirection.value = 'slide-next'
  } else if (index < currentImageIndex.value) {
    slideDirection.value = 'slide-prev'
  }
  currentImageIndex.value = index
}
</script>

<template>
  <ProductLayout v-if="product">
    <div class="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">
      <!-- Carousel -->
      <div class="w-full md:w-1/2">
        <div
          class="relative overflow-hidden rounded-2xl shadow-lg aspect-4/3 bg-gray-100"
          :style="{ viewTransitionName: 'product-card-' + product.id }"
        >
          <Transition :name="slideDirection">
            <img
              :key="currentImageIndex"
              :src="product.images[currentImageIndex]"
              class="w-full h-full object-cover absolute inset-0"
              :alt="product.title"
            />
          </Transition>

          <button
            v-if="product.images.length > 1"
            @click="prevImage"
            class="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 p-3 rounded-full hover:bg-white transition-colors shadow-md z-20 cursor-pointer"
            aria-label="Anterior imagen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-6 h-6"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            v-if="product.images.length > 1"
            @click="nextImage"
            class="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-3 rounded-full hover:bg-white transition-colors shadow-md z-20 cursor-pointer"
            aria-label="Siguiente imagen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-6 h-6"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            <!--suppress JSUnusedLocalSymbols -->
            <button
              v-for="(_, index) in product.images"
              :key="index"
              @click="selectImage(index)"
              class="w-3 h-3 rounded-full transition-colors border border-white/50 shadow-sm cursor-pointer"
              :class="currentImageIndex === index ? 'bg-primary' : 'bg-white/70'"
              :aria-label="'Ir a imagen ' + (index + 1)"
            ></button>
          </div>
        </div>

        <!-- Thumbnails -->
        <div class="flex gap-4 mt-4 overflow-x-auto pb-2">
          <button
            v-for="(img, index) in product.images"
            :key="index"
            @click="selectImage(index)"
            class="shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer"
            :class="currentImageIndex === index ? 'border-primary' : 'border-transparent'"
          >
            <img :src="img" class="w-full h-full object-cover" :alt="`miniatura ${index + 1} de ${product.title}`">
          </button>
        </div>
      </div>

      <!-- Details -->
      <div class="w-full md:w-1/2 flex flex-col justify-center">
        <Heading1 class-name="text-left mb-2">{{ product.title }}</Heading1>
        <div class="flex flex-wrap gap-2 mb-6">
          <span
            v-for="(tag, key) in product.tags"
            :key="key"
            class="bg-primary/20 text-text-page text-sm font-semibold px-4 py-1 rounded-full border border-primary/30"
          >
            {{ tag }}
          </span>
        </div>
        <p class="text-text-page2 text-lg leading-relaxed mb-8">
          {{ product.description }}
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <button
            class="bg-primary text-text-page font-bold py-4 px-10 rounded-2xl hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all shadow-md cursor-pointer"
          >
            Añadir al carrito
          </button>
          <button
            class="border-2 border-primary text-text-page font-bold py-4 px-10 rounded-2xl hover:bg-primary/10 transition-all cursor-pointer"
            @click="router.back()"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  </ProductLayout>
  <div v-else class="text-center py-20">
    <p class="text-2xl text-text-page2">Producto no encontrado</p>
    <router-link to="/products" class="text-primary hover:underline mt-4 block">Volver al catálogo</router-link>
  </div>
</template>

<style scoped>
/* Animaciones de deslizamiento */

img {
  backface-visibility: hidden;
}
</style>
