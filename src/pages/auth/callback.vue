<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";

const router = useRouter();
const authStore = useAuthStore();
const errorHeading = useTemplateRef<HTMLElement>("errorHeading");

onMounted(async () => {
  try {
    await router.replace(await authStore.signinCallback());
  } catch {
    await nextTick();
    errorHeading.value?.focus();
  }
});
</script>

<template>
  <main class="grid min-h-svh place-items-center bg-background p-6 text-center">
    <section class="max-w-md space-y-4" aria-live="polite">
      <template v-if="authStore.error">
        <h1 ref="errorHeading" tabindex="-1" class="text-2xl font-semibold">
          No pudimos iniciar tu sesión
        </h1>
        <p role="alert" class="text-muted-foreground">{{ authStore.error }}</p>
        <div class="flex flex-wrap justify-center gap-3">
          <RouterLink class="underline underline-offset-4" to="/login" replace
            >Reintentar</RouterLink
          >
          <RouterLink class="underline underline-offset-4" to="/">Volver al inicio</RouterLink>
        </div>
      </template>
      <template v-else>
        <h1 class="text-2xl font-semibold">Completando inicio de sesión</h1>
        <p role="status" class="text-muted-foreground">Espera un momento…</p>
      </template>
    </section>
  </main>
</template>
