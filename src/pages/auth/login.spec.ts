import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, reactive } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./login.vue";

const mocks = vi.hoisted(() => ({
  route: { query: { returnUrl: "/pedido?paso=2" } },
  router: { replace: vi.fn() },
  store: {
    authenticated: false,
    loading: false,
    error: null as string | null,
    signin: vi.fn(),
  },
}));

vi.mock("vue-router", () => ({
  useRoute: () => mocks.route,
  useRouter: () => mocks.router,
}));
vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => reactive(mocks.store),
}));

describe("login hospedado", () => {
  beforeEach(() => {
    const store = reactive(mocks.store);
    mocks.route.query.returnUrl = "/pedido?paso=2";
    store.authenticated = false;
    store.loading = false;
    store.error = null;
    store.signin.mockReset();
    mocks.router.replace.mockReset();
  });

  it("inicia OIDC automáticamente con un retorno local seguro", () => {
    const wrapper = mount(LoginPage);

    expect(mocks.store.signin).toHaveBeenCalledOnce();
    expect(mocks.store.signin).toHaveBeenCalledWith("/pedido?paso=2");
    expect(wrapper.find("form").exists()).toBe(false);
    expect(wrapper.find("input").exists()).toBe(false);
    expect(wrapper.text().toLowerCase()).not.toMatch(/email|password|contraseña/);
  });

  it("espera a que termine la inicialización antes de iniciar OIDC", async () => {
    const store = reactive(mocks.store);
    store.loading = true;
    mount(LoginPage);

    expect(store.signin).not.toHaveBeenCalled();

    store.loading = false;
    await nextTick();

    expect(store.signin).toHaveBeenCalledOnce();
    expect(store.signin).toHaveBeenCalledWith("/pedido?paso=2");
  });

  it("sustituye una sesión existente por el retorno sanitizado", async () => {
    const store = reactive(mocks.store);
    store.authenticated = true;
    mocks.route.query.returnUrl = "https://evil.example/steal";
    store.loading = true;
    mount(LoginPage);

    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(store.signin).not.toHaveBeenCalled();

    store.loading = false;
    await nextTick();

    expect(mocks.router.replace).toHaveBeenCalledWith("/admin/products");
    expect(store.signin).not.toHaveBeenCalled();
  });

  it("usa el retorno predeterminado para evitar bucles de autenticación", () => {
    mocks.route.query.returnUrl = "/login?returnUrl=/pedido";
    mount(LoginPage);

    expect(mocks.store.signin).toHaveBeenCalledWith("/admin/products");
  });

  it("muestra el error del redirect sin repetirlo y permite reintentar", async () => {
    const store = reactive(mocks.store);
    store.signin.mockImplementation(async () => {
      store.error = null;
      store.loading = true;
      await Promise.resolve();
      store.loading = false;
      store.error = "No se pudo iniciar sesión. Inténtalo de nuevo.";
    });
    const wrapper = mount(LoginPage);

    await flushPromises();

    expect(store.signin).toHaveBeenCalledOnce();
    expect(wrapper.get('[role="alert"]').text()).toContain("No se pudo iniciar sesión");
    expect(wrapper.get("button").text()).toContain("Reintentar");

    await wrapper.get("button").trigger("click");

    expect(store.signin).toHaveBeenCalledTimes(2);
  });
});
