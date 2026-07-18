<script setup lang="ts">
import { useRoute } from "vue-router";
import DarkModeToggle from "@/components/DarkModeToggle.vue";

const route = useRoute();

const menuItems = [
  { name: "Inicio", href: "/" },
  { name: "Productos", href: "/admin/products" },
  { name: "Componentes", href: "/admin/components" },
  { name: "Solicitudes", href: "/admin/solicitudes" },
  { name: "Historial de Pedidos", href: "/admin/orders" },
  { name: "Agenda", href: "/admin/agenda" },
];
</script>

<template>
  <header class="sticky top-0 z-50 w-full border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
    <div class="flex h-16 items-center px-4 max-w-7xl mx-auto justify-between w-full">
      <nav class="hidden md:flex items-center gap-6">
        <router-link
          v-for="item in menuItems"
          :key="item.href"
          :to="item.href"
          class="text-sm font-medium transition-colors hover:text-[#701548] dark:hover:text-[#ead9ea]"
          :class="route.path === item.href ? 'text-[#701548] dark:text-[#ead9ea] font-semibold' : 'text-gray-600 dark:text-gray-300'"
        >
          {{ item.name }}
        </router-link>
      </nav>
      <div class="flex items-center gap-4">
        <DarkModeToggle />
      </div>
    </div>
    <div class="md:hidden border-t border-gray-100 dark:border-gray-800 p-3 overflow-x-auto flex gap-4 bg-gray-50 dark:bg-gray-900">
      <router-link
        v-for="item in menuItems"
        :key="item.href"
        :to="item.href"
        class="whitespace-nowrap text-sm font-medium transition-colors hover:text-[#701548] px-3 py-1.5 rounded-md"
        :class="route.path === item.href ? 'bg-[#ead9ea] text-[#701548] dark:bg-[#701548] dark:text-[#ead9ea] font-semibold' : 'text-gray-600 dark:text-gray-300'"
      >
        {{ item.name }}
      </router-link>
    </div>
  </header>
</template>
