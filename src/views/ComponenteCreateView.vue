<script setup lang="ts">
import { ref } from "vue";
import { useLoadingButton } from "@/composables/useLoadingButton";
import { LoadingButton } from "@/components/ui/loading-button";
import { ComponentsApi } from "@/services/products/componentsApi";

const componente = ref({
  nombre: "",
  tipo: "MATERIAL",
  descripcion: "",
  unidadMedida: "",
  requierePedidoPrevio: false,
});

const tipos = ["MATERIAL", "ELEMENTO_ELABORADO", "SERVICIO"];
const componentsApi = new ComponentsApi();

const { status, message, execute } = useLoadingButton({
  errorDuration: 5000,
  successDuration: 3000,
});

const submitComponente = async () => {
  await execute(async () => {
    await componentsApi.createComponentes({
      nombre: componente.value.nombre,
      tipo: componente.value.tipo,
      descripcion: componente.value.descripcion,
      unidad_medida: componente.value.unidadMedida,
      requiere_pedido_previo: componente.value.requierePedidoPrevio,
      activo: true,
    });

    componente.value = {
      nombre: "",
      tipo: "MATERIAL",
      descripcion: "",
      unidadMedida: "",
      requierePedidoPrevio: false,
    };
  });
};
</script>

<template>
  <div class="max-w-2xl mx-auto p-6 bg-white rounded shadow mt-10">
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Crear Nuevo Componente</h1>

    <form @submit.prevent class="space-y-6">
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
          v-model="componente.unidadMedida"
          required
          placeholder="ej. unidad, kg, metros"
          class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div class="flex items-center">
        <input
          type="checkbox"
          v-model="componente.requierePedidoPrevio"
          id="pedidoPrevio"
          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label for="pedidoPrevio" class="ml-2 block text-sm text-gray-900"
          >Requiere Pedido Previo</label
        >
      </div>

      <div class="flex justify-end pt-4">
        <LoadingButton
          :loading="status === 'loading'"
          :status="status"
          :message="message"
          @click="submitComponente"
        >
          Crear Componente
        </LoadingButton>
      </div>
    </form>
  </div>
</template>
