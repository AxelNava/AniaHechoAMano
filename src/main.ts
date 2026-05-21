import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { asyncPromisePlugin } from "./plugins/async-promise-loading";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(asyncPromisePlugin);

app.mount("#app");
