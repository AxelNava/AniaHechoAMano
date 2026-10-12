<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ADMIN_RETURN_URL, sanitizeReturnUrl } from "@/auth/authService";
import { useAuthStore } from "@/stores/authStore";

const authEntryPaths = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
  "/auth/logout-callback",
]);
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const redirectStarted = shallowRef(false);
const sessionRedirectStarted = shallowRef(false);
const redirectError = shallowRef<string | null>(null);

const safeReturnUrl = computed(() => {
  const localUrl = sanitizeReturnUrl(route.query.returnUrl);
  const [pathname] = localUrl.split(/[?#]/);
  return authEntryPaths.has(pathname) ? ADMIN_RETURN_URL : localUrl;
});

const errorMessage = computed(() => authStore.error ?? redirectError.value);
const statusMessage = computed(() => {
  if (authStore.loading) {
    return redirectStarted.value ? "Redirigiendo a IdentityServer…" : "Comprobando tu sesión…";
  }

  return "Redirigiendo al inicio de sesión seguro…";
});

async function startSignin(): Promise<void> {
  if (redirectStarted.value || authStore.authenticated || authStore.loading) return;

  redirectStarted.value = true;
  redirectError.value = null;

  try {
    await authStore.signin(safeReturnUrl.value);
  } catch {
    redirectError.value = "No se pudo iniciar sesión. Inténtalo de nuevo.";
  }
}

function redirectAuthenticatedSession(): void {
  if (sessionRedirectStarted.value) return;

  sessionRedirectStarted.value = true;
  void router.replace(safeReturnUrl.value);
}

function retrySignin(): void {
  redirectStarted.value = false;
  void startSignin();
}

watch(
  () => [authStore.loading, authStore.authenticated] as const,
  ([loading, authenticated]) => {
    if (loading) return;
    if (authenticated) {
      redirectAuthenticatedSession();
      return;
    }

    void startSignin();
  },
  { immediate: true },
);
</script>

<template>
  <main class="grid min-h-svh place-items-center bg-background p-6 text-center">
    <section class="max-w-md space-y-4" aria-live="polite">
      <h1 class="text-2xl font-semibold">Inicio de sesión seguro</h1>
      <p v-if="errorMessage" role="alert" class="text-muted-foreground">{{ errorMessage }}</p>
      <p v-else role="status" class="text-muted-foreground">{{ statusMessage }}</p>
      <button
        v-if="errorMessage"
        type="button"
        class="rounded-md border border-gray-300 px-4 py-2 font-medium dark:border-gray-700"
        @click="retrySignin"
      >
        Reintentar
      </button>
    </section>
  </main>
</template>
