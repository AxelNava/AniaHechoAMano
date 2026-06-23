<script setup lang="ts">
import { useRouter } from "vue-router";
import type { ProductDto } from "@/types/products/ProductDto";

defineProps<{
  row: ProductDto;
  value: unknown;
}>();

const router = useRouter();
</script>

<template>
  <div class="inline-flex flex-wrap justify-end gap-2">
    <button
      @click="router.push(`/admin/products/edit/${row.id}`)"
      class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
    >
      Editar
    </button>
    <button
      @click="router.push(`/admin/products/${row.id}/orders`)"
      class="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
    >
      Historial
    </button>
    <button
      @click="router.push(`/admin/products/${row.id}/orders/new`)"
      class="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
    >
      Registrar Pedido
    </button>
  </div>
</template>
