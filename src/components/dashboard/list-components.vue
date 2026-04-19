<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useComponentsStore } from "@/stores/componentsStore";
import { storeToRefs } from "pinia";
import { Search } from "lucide-vue-next";

const router = useRouter();
const componentsStore = useComponentsStore();
const { components, isLoading } = storeToRefs(componentsStore);

const searchQuery = ref("");

const filteredComponents = computed(() => {
  if (!searchQuery.value) return components.value;
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return components.value.filter(
    (comp) =>
      comp.nombre.toLowerCase().includes(lowerCaseQuery) ||
      (comp.descripcion && comp.descripcion.toLowerCase().includes(lowerCaseQuery)) ||
      comp.tipo.toLowerCase().includes(lowerCaseQuery)
  );
});

onMounted(() => {
  componentsStore.fetchComponents();
});
</script>

<template>
  <section class="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
    <div class="relative w-full sm:w-96">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search class="h-5 w-5 text-gray-400" />
      </div>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar componentes..."
        class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
    </div>
    <button
      @click="router.push('/admin/components/new')"
      class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
    >
      Crear Componente
    </button>
  </section>

  <div v-if="isLoading" class="text-center py-8 text-gray-500">
    Cargando componentes...
  </div>
  <div v-else>
    <section v-if="filteredComponents.length > 0" class="bg-white rounded-lg shadow mb-8">
      <section class="px-4 py-3 border-b bg-gray-50">
        <h2 class="font-semibold text-gray-700">Lista de Componentes</h2>
      </section>
      <article class="divide-y">
        <div
          v-for="comp in filteredComponents"
          :key="comp.id"
          class="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-gray-50"
        >
          <div class="flex-1 min-w-50">
            <p class="font-medium text-gray-800">{{ comp.nombre }}</p>
            <p class="text-sm text-gray-500">{{ comp.descripcion || "Sin descripción" }}</p>
          </div>
          
          <!-- Columnas adicionales preparadas para el futuro -->
          <div class="hidden md:flex flex-1 min-w-32 flex-col justify-center">
             <span class="text-xs text-gray-500 uppercase font-semibold tracking-wider">Tipo</span>
             <span class="text-sm text-gray-800">{{ comp.tipo }}</span>
          </div>

          <div class="hidden sm:flex flex-1 min-w-32 flex-col justify-center">
             <span class="text-xs text-gray-500 uppercase font-semibold tracking-wider">Unidad</span>
             <span class="text-sm text-gray-800">{{ comp.unidad_medida }}</span>
          </div>

          <div class="flex items-center gap-4">
            <span
              :class="[
                'px-2 py-1 rounded-full text-xs font-medium',
                comp.activo !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600',
              ]"
            >
              {{ comp.activo !== false ? "Activo" : "Inactivo" }}
            </span>
            <div class="flex gap-2">
              <button
                @click="router.push(`/admin/components/edit/${comp.id}`)"
                class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      </article>
    </section>
    
    <section v-else class="text-center py-12 bg-white rounded-lg shadow">
      <h3 class="mt-2 text-sm font-semibold text-gray-900">No hay componentes</h3>
      <p class="mt-1 text-sm text-gray-500">
        No se encontraron componentes. Comienza creando uno nuevo.
      </p>
    </section>
  </div>
</template>

<style scoped></style>
