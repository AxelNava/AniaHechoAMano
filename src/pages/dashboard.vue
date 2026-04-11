<script setup lang="ts">
import AppLayout from "@/layouts/AppLayout.vue";
import type { BreadcrumbItem } from "@/types";
import { onMounted } from "vue";
import ListProducts from "@/components/dashboard/list-products.vue";

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
  },
];

onMounted(() => {
  document.title = "Dashboard";
});
</script>

<template>
  <AppLayout :breadcrumbs="breadcrumbs">
    <router-link to="/admin/products/new">Agregar nuevo producto</router-link>
    <section class="mx-4">
      <h1 class="text-2xl font-bold mb-6">Listado de Productos</h1>
      <list-products />
    </section>
  </AppLayout>
</template>
