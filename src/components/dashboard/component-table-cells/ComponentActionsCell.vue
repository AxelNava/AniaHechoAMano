<script setup lang="ts">
import { useRouter } from "vue-router";
import type { ComponenteDto } from "@/types/products/ComponenteDto";

defineProps<{
  row: ComponenteDto;
  value: unknown;
}>();

const router = useRouter();
</script>

<template>
  <div class="inline-flex flex-wrap justify-end gap-2">
    <button
      @click="router.push(`/admin/components/edit/${row.id}`)"
      class="inline-flex items-center gap-1 rounded-md border border-text-page/30 bg-white px-3 py-1.5 text-xs font-medium text-text-page shadow-sm transition-colors hover:bg-text-page hover:text-white"
    >
      Editar
    </button>
  </div>
</template>
