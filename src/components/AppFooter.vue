<script setup lang="ts">
const SLOGAN =
  'Creaciones artesanales únicas, hechas con amor y dedicación para hacer de tus momentos especiales algo inolvidable.'
</script>

<template>
  <footer
    class="bg-text-page max-lg:px-12 max-md:px-6 max-md:[&_article>article]:mt-6 py-8 px-28 text-white font-sans-serif"
  >
    <article class="xs:grid xs:grid-cols-2 lg:flex lg:flex-row lg:flex-wrap gap-8 lg:gap-x-32 gap-y-8">
      <div class="logo-container grid justify-items-start">
        <h2 class="text-4xl font-dancing font-bold">Ania</h2>
        <p class="max-w-[40ch] text-balance text-sm normal-text leading-7">
          {{ SLOGAN }}
        </p>
      </div>

      <article>
        <h3 class="text-white font-bold text-xl">Productos</h3>
        <ul class="mt-3 *:my-2 normal-text">
          <li><a href="">Piñatas 🪅</a></li>
          <li><a href="">Adornos 🎉</a></li>
          <li><a href="">Papelería creativa</a></li>
          <li><a href="">Cajas sorpresa 🎁</a></li>
        </ul>
      </article>
      <article>
        <h3 class="text-white font-bold text-xl">Servicios</h3>
        <ul class="mt-3 *:my-2 normal-text">
          <li><a href="">Ramos florales y artificiales</a></li>
          <li><a href="">Desayunos</a></li>
          <li><a href="">Fotos polaroid</a></li>
        </ul>
      </article>
      <article>
        <h3 class="text-white font-bold text-xl">Información importante</h3>
        <ul class="mt-3 *:my-2 normal-text">
          <li><a href="">Política de pedidos</a></li>
          <li><a href="">Política de privacidad</a></li>
        </ul>
      </article>

      <article>
        <h3 class="text-white font-bold text-xl">Contacto</h3>
        <ul class="mt-3 *:my-2 normal-text">
          <li><a href="">Facebook</a></li>
          <li><a href="">Guerrero, México</a></li>
        </ul>
      </article>
      <article>
        <h3 class="text-white font-bold text-xl">Síguenos</h3>
        <ul class="mt-3 *:my-2 normal-text">
          <li><a href="">Facebook</a></li>
          <li><a href="">TikTok</a></li>
        </ul>
      </article>
    </article>
    <div class="border-b-1 w-full opacity-60 mt-4 rounded-2xl"></div>
  </footer>
</template>
