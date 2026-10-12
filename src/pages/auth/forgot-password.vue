<script setup lang="ts">
import { onMounted, shallowRef } from "vue";
import { RouterLink, useRouter } from "vue-router";

const router = useRouter();
const redirectFailed = shallowRef(false);

onMounted(async () => {
  try {
    await router.replace({ name: "login" });
  } catch {
    redirectFailed.value = true;
  }
});
</script>

<template>
  <main class="grid min-h-svh place-items-center bg-background p-6 text-center">
    <section class="max-w-md space-y-4" aria-live="polite">
      <h1 class="text-2xl font-semibold">Acceso seguro</h1>
      <template v-if="redirectFailed">
        <p role="alert" class="text-muted-foreground">
          No se pudo abrir el inicio de sesión seguro.
        </p>
        <RouterLink class="underline underline-offset-4" to="/login">Reintentar</RouterLink>
      </template>
      <p v-else role="status" class="text-muted-foreground">
        Redirigiendo al inicio de sesión hospedado…
      </p>
    </section>
  </main>
</template>
