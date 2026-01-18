<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import PrimaryLogo from '@/components/PrimaryLogo.vue'
import SecondaryButton from '@/components/base/SecondaryButton.vue'
import Heading1 from '@/components/base/Heading1.vue'
import ProductCard from '@/components/ProductCard.vue'
import defaultImage from '@/assets/images/PXL_20250201_210547830~2.jpg'

const someTags = {
  ADORNOS: 'Adornos',
  PAPELERIA: 'Papelería creativa',
  CAJAS: 'Cajas',
  DESAYUNOS: 'Desayunos',
}
</script>

<template>
  <div class="grid grid-rows-[auto_auto_1fr]">
    <AppHeader />
    <main>
      <section class="bg-primary py-12">
        <PrimaryLogo :is-main-title="true" />
        <p class="mt-10 mx-auto w-[50ch] text-xl text-center text-text-page2 leading-9">
          Creaciones únicas y personalizadas para hacer de tus momentos especiales algo inolvidable.
          Cada pieza está hecha con amor y dedicación.
        </p>
        <div class="mt-10 mx-auto grid grid-cols-[auto_auto] place-content-center gap-x-5 grid-flow-col">
          <SecondaryButton url="" :selected="true">Ver productos</SecondaryButton>
          <SecondaryButton url="">Contactar</SecondaryButton>
        </div>
      </section>

      <section class="my-14">
        <Heading1 class-name="text-text-page my-2">Nuestros productos</Heading1>
        <p class="text-center text-text-page2 text-balance w-[50ch] leading-8 text-xl mx-auto">
          Descubre nuestra colección de creaciones artesanales, cada una hecha con dedicación y amor
          al detalle.
        </p>
        <article
          class="grid grid-rows-[1fr_fit-content] max-md:mx-10 md:grid-cols-3 gap-10 md:gap-14 my-19 lg:mx-40"
        >
          <ProductCard
            title="Adorno de graduación elegante"
            class-name="row-span-2 md:col-span-2"
            :tags="someTags"
            :image-src="defaultImage"
          >
            Decoración perfecta para celebrar el logro académico con estilo y elegancia.
          </ProductCard>
          <ProductCard
            title="Adorno de graduación elegante"
            class-name="row-span-2"
            :tags="someTags"
            image-src=""
          >
            Decoración perfecta para celebrar el logro académico con estilo y elegancia.
          </ProductCard>
          <ProductCard
            title="Adorno de graduación elegante"
            class-name="row-span-2"
            :tags="someTags"
            image-src=""
          >
            Decoración perfecta para celebrar el logro académico con estilo y elegancia.
          </ProductCard>
          <ProductCard
            title="Adorno de graduación elegante"
            class-name="row-span-2"
            :tags="someTags"
            image-src=""
          >
            Decoración perfecta para celebrar el logro académico con estilo y elegancia.
          </ProductCard>
          <ProductCard
            title="Adorno de graduación elegante"
            class-name="row-span-2"
            :tags="someTags"
            image-src=""
          >
            Decoración perfecta para celebrar el logro académico con estilo y elegancia.
          </ProductCard>
        </article>
      </section>
    </main>
    <AppFooter />
  </div>
</template>
