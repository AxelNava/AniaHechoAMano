<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import DarkModeToggle from "@/components/DarkModeToggle.vue";
import { useAuthStore } from "@/stores/authStore";

const route = useRoute();
const authStore = useAuthStore();
const displayName = computed(() =>
  String(
    authStore.profile?.name ?? authStore.profile?.preferred_username ?? "Cuenta administradora",
  ),
);
const email = computed(() =>
  typeof authStore.profile?.email === "string" ? authStore.profile.email : "",
);
const esRutaActiva = (href: string) =>
  route.path === href || (href === "/admin/agenda" && route.path.startsWith(`${href}/`));
const menuItems = [
  { name: "Inicio", href: "/" },
  { name: "Productos", href: "/admin/products" },
  { name: "Importar catálogo", href: "/admin/products/import" },
  { name: "Componentes", href: "/admin/components" },
  { name: "Solicitudes", href: "/admin/solicitudes" },
  { name: "Historial de Pedidos", href: "/admin/orders" },
  { name: "Agenda", href: "/admin/agenda" },
  { name: "Perfil", href: "/settings/profile" },
];
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
  >
    <div class="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4">
      <nav class="hidden items-center gap-6 md:flex" aria-label="Administración">
        <router-link
          v-for="item in menuItems"
          :key="item.href"
          :to="item.href"
          class="text-sm font-medium transition-colors hover:text-[#701548] dark:hover:text-[#ead9ea]"
          :class="
            esRutaActiva(item.href)
              ? 'font-semibold text-[#701548] dark:text-[#ead9ea]'
              : 'text-gray-600 dark:text-gray-300'
          "
        >
          {{ item.name }}
        </router-link>
      </nav>
      <div class="flex min-w-0 items-center gap-3">
        <router-link
          to="/settings/profile"
          aria-label="Ver perfil"
          class="hidden min-w-0 rounded-sm text-right outline-none focus-visible:ring-2 focus-visible:ring-[#701548] focus-visible:ring-offset-2 sm:block dark:focus-visible:ring-[#ead9ea] dark:focus-visible:ring-offset-gray-900"
        >
          <span class="block truncate text-sm font-medium text-gray-900 dark:text-white">
            {{ displayName }}
          </span>
          <span v-if="email" class="block truncate text-xs text-gray-600 dark:text-gray-300">
            {{ email }}
          </span>
        </router-link>
        <button
          type="button"
          aria-label="Cerrar sesión"
          class="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#701548] disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800 dark:focus-visible:outline-[#ead9ea]"
          :disabled="authStore.loading"
          @click="authStore.signout"
        >
          {{ authStore.loading ? "Saliendo…" : "Salir" }}
        </button>
        <DarkModeToggle />
      </div>
    </div>
    <p
      v-if="authStore.error"
      role="alert"
      class="mx-auto max-w-7xl px-4 pb-2 text-sm text-red-700 dark:text-red-300"
    >
      {{ authStore.error }}
    </p>
    <nav
      class="flex gap-4 overflow-x-auto border-t border-gray-100 bg-gray-50 p-3 md:hidden dark:border-gray-800 dark:bg-gray-900"
      aria-label="Administración móvil"
    >
      <router-link
        v-for="item in menuItems"
        :key="item.href"
        :to="item.href"
        class="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium"
        :class="
          esRutaActiva(item.href)
            ? 'bg-[#ead9ea] text-[#701548] dark:bg-[#701548] dark:text-[#ead9ea]'
            : 'text-gray-600 dark:text-gray-300'
        "
      >
        {{ item.name }}
      </router-link>
    </nav>
  </header>
</template>
