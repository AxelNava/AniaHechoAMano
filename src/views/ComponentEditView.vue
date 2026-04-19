<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useComponentsStore } from "@/stores/componentsStore";
import { toast } from "vue-sonner";

const route = useRoute();
const router = useRouter();
const componentsStore = useComponentsStore();

const componente = ref({
  id: 0,
  nombre: "",
  tipo: "MATERIAL",
  descripcion: "",
  unidad_medida: "",
  requiere_pedido_previo: false,
  activo: true,
});

const loading = ref(false);
const isFetching = ref(true);

const tipos = ["MATERIAL", "ELEMENTO_ELABORADO", "SERVICIO"];

onMounted(async () => {
  const idParam = route.params.id;
  const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam, 10);
  
  if (isNaN(id)) {
    toast.error("ID de componente inválido");
    router.push("/admin/components");
    return;
  }

  // Ensure components are loaded
  await componentsStore.fetchComponents();
  
  const foundComponent = componentsStore.components.find(c => c.id === id);
  if (foundComponent) {
    componente.value = {
      id: foundComponent.id,
      nombre: foundComponent.nombre,
      tipo: foundComponent.tipo,
      descripcion: foundComponent.descripcion || "",
      unidad_medida: foundComponent.unidad_medida,
      requiere_pedido_previo: foundComponent.requiere_pedido_previo,
      activo: foundComponent.activo !== false,
    };
  } else {
    toast.error("Componente no encontrado");
    router.push("/admin/components");
  }
  
  isFetching.value = false;
});

const submitComponente = async () => {
  loading.value = true;

  try {
    // Aquí idealmente llamaríamos a la API: await componentsApi.updateComponent(componente.value)
    // Como el endpoint no existe aún, actualizamos el store (caché local)
    componentsStore.updateComponent(componente.value.id, {
      nombre: componente.value.nombre,
      tipo: componente.value.tipo,
      descripcion: componente.value.descripcion,
      unidad_medida: componente.value.unidad_medida,
      requiere_pedido_previo: componente.value.requiere_pedido_previo,
      activo: componente.value.activo,
    });

    toast.success("Componente actualizado exitosamente", {
      style: {
        background: '#111827',
        color: '#fff',
        border: 'none',
      }
    });
    
    // Opcional: volver a la lista o quedarse en la vista
    router.push("/admin/components");
  } catch (_) {
    toast.error("Error al actualizar el componente");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="max-w-2xl mx-auto p-6 bg-white rounded shadow mt-10">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Editar Componente</h1>
      <button 
        @click="router.push('/admin/components')"
        class="text-gray-500 hover:text-gray-700 text-sm font-medium"
      >
        &larr; Volver
      </button>
    </div>

    <div v-if="isFetching" class="text-center py-12 text-gray-500">
      Cargando datos del componente...
    </div>

    <form v-else @submit.prevent="submitComponente" class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          v-model="componente.nombre"
          required
          class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
        <select
          v-model="componente.tipo"
          class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option v-for="t in tipos" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea
          v-model="componente.descripcion"
          rows="3"
          class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida</label>
        <input
          v-model="componente.unidad_medida"
          required
          placeholder="ej. unidad, kg, metros"
          class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div class="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
        <div class="flex items-center">
          <input
            type="checkbox"
            v-model="componente.requiere_pedido_previo"
            id="pedidoPrevio"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label for="pedidoPrevio" class="ml-2 block text-sm text-gray-900">
            Requiere Pedido Previo
          </label>
        </div>

        <div class="flex items-center">
          <input
            type="checkbox"
            v-model="componente.activo"
            id="activo"
            class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label for="activo" class="ml-2 block text-sm text-gray-900">
            Componente Activo
          </label>
        </div>
      </div>

      <div class="flex justify-end pt-4">
        <button
          type="submit"
          :disabled="loading"
          class="bg-blue-600 text-white py-2 px-6 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        >
          {{ loading ? "Guardando..." : "Guardar Cambios" }}
        </button>
      </div>
    </form>
  </div>
</template>
