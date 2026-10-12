import type { Pinia } from "pinia";
import type { App } from "vue";
import type { Router } from "vue-router";
import { asyncPromisePlugin } from "./plugins/async-promise-loading";
import { initializeAuth, type AuthState } from "./router/authGuard";

export interface ApplicationBootstrapOptions {
  app: App;
  pinia: Pinia;
  router: Router;
  authStore: AuthState;
  mountTarget?: string | Element;
}

export async function bootstrapApplication({
  app,
  pinia,
  router,
  authStore,
  mountTarget = "#app",
}: ApplicationBootstrapOptions): Promise<void> {
  app.use(pinia);
  app.use(asyncPromisePlugin);

  await initializeAuth(authStore);

  app.use(router);
  await router.isReady();
  app.mount(mountTarget);
}
