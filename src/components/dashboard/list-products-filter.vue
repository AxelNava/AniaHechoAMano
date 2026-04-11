<script setup lang="ts">
import CustomSelect from "@/components/ui/select/custom-select.vue";
</script>

<template>
  <section class="grid grid-cols-2 gap-4">
    <div class="grid grid-cols-subgrid">
      <label for="priceFilter">Precio</label>
      <custom-select name="price" id="priceFilter" :options="[]"></custom-select>
    </div>
    <div class="grid grid-cols-subgrid">
      <label for="categoryFilter">Categoria</label>
      <custom-select name="category" id="categoryFilter" :options="[]"></custom-select>
    </div>
    <div class="grid grid-cols-subgrid">
      <label for="activeFilter">Activo</label>
      <custom-select name="active" id="activeFilter" :options="[]"></custom-select>
    </div>
    <div class="grid grid-cols-subgrid">
      <label for="mostRequestedFilter">Mas solicitados</label>
      <custom-select name="mostRequested" id="mostRequestedFilter" :options="[]"></custom-select>
    </div>
  </section>
</template>

<style scoped></style>
