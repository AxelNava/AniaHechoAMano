<script setup lang="ts">
import PrimaryButton from './base/PrimaryButton.vue'
</script>

<template>
  <nav class="max-lg:relative">
    <ul
      class="grid max-lg:bg-white max-sm:px-2 max-lg:grid-cols-[auto_auto_auto] gap-x-4 max-lg:w-[100dvw] max-sm:gap-x-2 max-sm:*:*:text-[0.75rem] max-sm:*:*:px-2 lg:grid-flow-col max-lg:gap-y-8 lg:gap-4 justify-items-center items-center justify-center py-4 navigation-buttons transition-transform"
    >
      <li>
        <PrimaryButton url="/" :selected="true">Inicio</PrimaryButton>
      </li>
      <li>
        <PrimaryButton url="">Todos</PrimaryButton>
      </li>
      <li>
        <PrimaryButton url="">Adornos de fiesta</PrimaryButton>
      </li>
      <li>
        <PrimaryButton url="">Papelería creativa</PrimaryButton>
      </li>
      <li>
        <PrimaryButton url="">Postres</PrimaryButton>
      </li>
    </ul>
  </nav>
</template>
