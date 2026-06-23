<script setup lang="ts">
import { AlertCircle, RefreshCw } from "lucide-vue-next";

withDefaults(
  defineProps<{
    message?: string;
    retrying?: boolean;
  }>(),
  {
    message: "",
    retrying: false,
  },
);

const emit = defineEmits<{
  retry: [];
}>();
</script>

<template>
  <div
    class="bg-white rounded-lg shadow ring-1 ring-secondary px-6 py-12 text-center"
    role="alert"
    aria-live="polite"
  >
    <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
      <AlertCircle class="h-7 w-7 text-red-500" />
    </div>
    <h3 class="text-lg font-semibold text-text-page">No pudimos cargar el historial</h3>
    <p class="mx-auto mt-1 max-w-md text-sm text-text-page2">
      {{ message || "Ocurrió un error al obtener los pedidos. Revisa tu conexión e inténtalo de nuevo." }}
    </p>
    <button
      type="button"
      :disabled="retrying"
      class="mt-5 inline-flex items-center gap-2 rounded-md bg-text-page px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-text-page/90 disabled:cursor-not-allowed disabled:opacity-60"
      @click="emit('retry')"
    >
      <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': retrying }" />
      {{ retrying ? "Reintentando..." : "Reintentar" }}
    </button>
  </div>
</template>
