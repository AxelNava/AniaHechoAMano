<script setup lang="ts">
import { onMounted } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";

const router = useRouter();
const authStore = useAuthStore();

async function completeLogout() {
  await authStore.signoutCallback();
  if (!authStore.error) await router.replace("/");
}

onMounted(completeLogout);
</script>

<template>
  <main class="grid min-h-svh place-items-center bg-background p-6 text-center">
    <section class="max-w-md space-y-4" aria-live="polite">
      <template v-if="authStore.error">
        <h1 class="text-2xl font-semibold">No pudimos completar el cierre de sesión</h1>
        <p role="alert" class="text-muted-foreground">{{ authStore.error }}</p>
        <button class="underline underline-offset-4" type="button" @click="completeLogout">
          Reintentar
        </button>
        <RouterLink class="ml-4 underline underline-offset-4" to="/">Volver al inicio</RouterLink>
      </template>
      <template v-else>
        <h1 class="text-2xl font-semibold">Cerrando sesión</h1>
        <p role="status" class="text-muted-foreground">Estamos limpiando tu sesión local…</p>
      </template>
    </section>
  </main>
</template>
