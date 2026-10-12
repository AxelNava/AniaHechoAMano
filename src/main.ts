import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { bootstrapApplication } from "./bootstrap";
import { subscribeHttpAuthSignal } from "./services/http/httpAuthSignal";
import { useAuthStore } from "./stores/authStore";

const app = createApp(App);
const pinia = createPinia();

const authStore = useAuthStore(pinia);
const unsubscribeHttpAuth = subscribeHttpAuthSignal(async (signal) => {
  if (signal === "forbidden") {
    if (router.currentRoute.value.name !== "forbidden") await router.replace({ name: "forbidden" });
    return;
  }

  const returnUrl = router.currentRoute.value.fullPath;
  try {
    await authStore.cleanup();
  } finally {
    if (router.currentRoute.value.name !== "login") {
      await router.replace({ name: "login", query: { returnUrl } });
    }
  }
});
import.meta.hot?.dispose(unsubscribeHttpAuth);

void bootstrapApplication({ app, pinia, router, authStore });
