<script setup lang="ts">
import { ref, computed } from "vue";
import { Filter, Search, X } from "lucide-vue-next";
import type { ProductListQueryDto } from "@/types/orders/orderHistoryDto";

type ProductFilters = Pick<ProductListQueryDto, "search" | "categoria_id" | "activo">;

defineProps<{
  categories?: Array<{ id: number; nombre: string }>;
  loading?: boolean;
}>();

const emit = defineEmits<{
  search: [filters: ProductFilters];
}>();

const searchText = ref("");
const categoriaId = ref("");
const activo = ref("");
const showFilters = ref(false);

const activeFilterCount = computed(() => {
  let count = 0;
  if (categoriaId.value !== "") count += 1;
  if (activo.value !== "") count += 1;
  return count;
});

const submit = () => {
  emit("search", {
    search: searchText.value.trim() || undefined,
    categoria_id: categoriaId.value === "" ? undefined : Number(categoriaId.value),
    activo: activo.value === "" ? undefined : activo.value === "true",
  });
};

const clearFilters = () => {
  categoriaId.value = "";
  activo.value = "";
  submit();
};

const selectClass =
  "rounded-md border border-secondary bg-white px-3 py-2 text-sm text-text-page focus:border-text-page focus:outline-none focus:ring-1 focus:ring-text-page";
</script>

<template>
  <section class="mb-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search class="h-5 w-5 text-text-page2" />
        </div>
        <input
          v-model="searchText"
          type="text"
          placeholder="Buscar productos..."
          @keyup.enter="submit"
          class="block w-full rounded-md border border-secondary bg-white py-2 pl-10 pr-3 text-sm text-text-page placeholder-text-page2/60 focus:border-text-page focus:outline-none focus:ring-1 focus:ring-text-page"
        />
      </div>

      <button
        type="button"
        :aria-expanded="showFilters"
        @click="showFilters = !showFilters"
        class="relative inline-flex items-center justify-center gap-2 rounded-md border border-text-page/30 bg-white px-4 py-2 text-sm font-medium text-text-page transition-colors hover:bg-primary"
      >
        <Filter class="h-4 w-4" />
        <span>Filtros</span>
        <span
          v-if="activeFilterCount > 0"
          class="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-text-page px-1.5 text-xs font-semibold text-white"
        >
          {{ activeFilterCount }}
        </span>
      </button>

      <button
        type="button"
        :disabled="loading"
        @click="submit"
        class="inline-flex items-center justify-center rounded-md bg-text-page px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-text-page/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ loading ? "Buscando..." : "Buscar" }}
      </button>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-show="showFilters" class="mt-3 rounded-lg border border-secondary bg-white p-4 shadow-sm">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1">
            <label
              for="categoryFilter"
              class="text-xs font-semibold uppercase tracking-wider text-text-page2"
            >
              Categoría
            </label>
            <select id="categoryFilter" v-model="categoriaId" :class="selectClass">
              <option value="">Todas</option>
              <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">
                {{ cat.nombre }}
              </option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="activeFilter"
              class="text-xs font-semibold uppercase tracking-wider text-text-page2"
            >
              Estado
            </label>
            <select id="activeFilter" v-model="activo" :class="selectClass">
              <option value="">Todos</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>
        </div>

        <div v-if="activeFilterCount > 0" class="mt-4 flex justify-end">
          <button
            type="button"
            @click="clearFilters"
            class="inline-flex items-center gap-1 text-sm text-text-page2 transition-colors hover:text-text-page"
          >
            <X class="h-4 w-4" />
            Limpiar filtros
          </button>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped></style>
