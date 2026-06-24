<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useComponentsStore } from "@/stores/componentsStore";
import { storeToRefs } from "pinia";
import { Search } from "lucide-vue-next";
import { DataTable, DataTableColumn } from "@/components/ui";
import ComponentNameCell from "@/components/dashboard/component-table-cells/ComponentNameCell.vue";
import ComponentTipoCell from "@/components/dashboard/component-table-cells/ComponentTipoCell.vue";
import ComponentUnidadCell from "@/components/dashboard/component-table-cells/ComponentUnidadCell.vue";
import ComponentStatusCell from "@/components/dashboard/component-table-cells/ComponentStatusCell.vue";
import ComponentActionsCell from "@/components/dashboard/component-table-cells/ComponentActionsCell.vue";
import type { ComponenteDto } from "@/types/products/ComponenteDto";

const router = useRouter();
const componentsStore = useComponentsStore();
const { components, isLoading, isFetched } = storeToRefs(componentsStore);

const searchQuery = ref("");
const refreshing = ref(false);

const refreshComponents = async () => {
  refreshing.value = true;
  try {
    await componentsStore.fetchComponents(true);
  } finally {
    refreshing.value = false;
  }
};

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

// DataTable exige `TRow extends Record<string, unknown>`; las interfaces no
// cumplen ese constraint, así que intersectamos para satisfacerlo.
type ComponentRow = ComponenteDto & Record<string, unknown>;
const rows = computed(() => filteredComponents.value as ComponentRow[]);

onMounted(() => {
  componentsStore.fetchComponents();
});
</script>

<template>
  <section class="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
    <div class="relative w-full sm:w-96">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search class="h-5 w-5 text-text-page2" />
      </div>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar componentes..."
        class="block w-full pl-10 pr-3 py-2 border border-secondary rounded-md leading-5 bg-white text-text-page placeholder-text-page2/60 focus:outline-none focus:ring-1 focus:ring-text-page focus:border-text-page sm:text-sm"
      />
    </div>
    <div class="flex w-full sm:w-auto gap-2">
      <button
        type="button"
        :disabled="refreshing"
        @click="refreshComponents"
        class="inline-flex items-center justify-center rounded-md border border-text-page/30 bg-white px-4 py-2 text-sm font-medium text-text-page transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ refreshing ? "Actualizando..." : "Actualizar" }}
      </button>
      <button
        @click="router.push('/admin/components/new')"
        class="flex-1 sm:flex-none px-4 py-2 bg-text-page text-white font-medium rounded-md hover:bg-text-page/90 transition-colors"
      >
        Crear Componente
      </button>
    </div>
  </section>

  <div v-if="isLoading && !isFetched" class="text-center py-8 text-text-page2">
    Cargando componentes...
  </div>
  <div v-else class="bg-white rounded-lg shadow ring-1 ring-secondary overflow-hidden mb-8">
    <section class="px-4 py-3 border-b border-secondary bg-primary/30">
      <h2 class="font-semibold text-text-page">Lista de Componentes</h2>
    </section>
    <DataTable
      :rows="rows"
      :row-key="(row) => row.id"
      empty-message="No se encontraron componentes. Comienza creando uno nuevo."
    >
      <DataTableColumn
        label="Componente"
        prop="nombre"
        cell-class="min-w-96"
        :cell-component="ComponentNameCell"
      />
      <DataTableColumn
        label="Tipo"
        prop="tipo"
        header-class="hidden md:table-cell"
        cell-class="hidden md:table-cell"
        :cell-component="ComponentTipoCell"
      />
      <DataTableColumn
        label="Unidad"
        prop="unidad_medida"
        header-class="hidden sm:table-cell"
        cell-class="hidden sm:table-cell"
        :cell-component="ComponentUnidadCell"
      />
      <DataTableColumn label="Estado" prop="activo" :cell-component="ComponentStatusCell" />
      <DataTableColumn
        label="Acciones"
        :accessor="(row) => row.id"
        header-class="text-right"
        cell-class="text-right"
        :cell-component="ComponentActionsCell"
      />
    </DataTable>
  </div>
</template>

<style scoped></style>
