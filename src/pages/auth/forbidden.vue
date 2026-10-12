<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
</script>

<template>
  <main class="grid min-h-svh place-items-center bg-background p-6 text-center">
    <section class="max-w-lg space-y-5">
      <p class="font-semibold text-[#701548] dark:text-[#ead9ea]">Error 403</p>
      <h1 class="text-3xl font-semibold">No tienes permisos para entrar aquí</h1>
      <p class="text-muted-foreground">
        Tu sesión sigue activa. Puedes volver al inicio o cambiar de cuenta.
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <RouterLink class="rounded-md bg-[#701548] px-4 py-2 font-medium text-white" to="/"
          >Volver al inicio</RouterLink
        >
        <button
          type="button"
          class="rounded-md border border-gray-300 px-4 py-2 font-medium disabled:opacity-60 dark:border-gray-700"
          :disabled="authStore.loading"
          @click="authStore.signout"
        >
          {{ authStore.loading ? "Cambiando cuenta…" : "Cambiar de cuenta" }}
        </button>
      </div>
      <p v-if="authStore.error" role="alert" class="text-sm text-red-700 dark:text-red-300">
        {{ authStore.error }}
      </p>
    </section>
  </main>
</template>
