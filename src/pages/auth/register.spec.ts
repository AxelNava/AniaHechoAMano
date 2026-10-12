import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, reactive } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./register.vue";

const mocks = vi.hoisted(() => ({
  route: { query: { returnUrl: "/pedido?paso=2" } },
  router: { replace: vi.fn() },
  store: {
    authenticated: false,
    loading: false,
    error: null as string | null,
    register: vi.fn(),
  },
}));

vi.mock("vue-router", () => ({
  useRoute: () => mocks.route,
  useRouter: () => mocks.router,
}));
vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => reactive(mocks.store),
}));

describe("registro hospedado", () => {
  beforeEach(() => {
    const store = reactive(mocks.store);
    mocks.route.query.returnUrl = "/pedido?paso=2";
    store.authenticated = false;
    store.loading = false;
    store.error = null;
    store.register.mockReset();
    mocks.router.replace.mockReset();
  });

  it("inicia el registro OIDC automáticamente sin credenciales locales", () => {
    const wrapper = mount(RegisterPage);

    expect(mocks.store.register).toHaveBeenCalledOnce();
    expect(mocks.store.register).toHaveBeenCalledWith("/pedido?paso=2");
    expect(wrapper.find("form").exists()).toBe(false);
    expect(wrapper.find("input").exists()).toBe(false);
    expect(wrapper.text().toLowerCase()).not.toMatch(/email|password|contraseña/);
  });

  it("espera a que termine la inicialización antes de iniciar el registro", async () => {
    const store = reactive(mocks.store);
    store.loading = true;
    mount(RegisterPage);

    expect(store.register).not.toHaveBeenCalled();

    store.loading = false;
    await nextTick();

    expect(store.register).toHaveBeenCalledOnce();
    expect(store.register).toHaveBeenCalledWith("/pedido?paso=2");
  });

  it("sustituye una sesión existente por un retorno local seguro", async () => {
    const store = reactive(mocks.store);
    store.authenticated = true;
    store.loading = true;
    mocks.route.query.returnUrl = "/categoria/joyas";
    mount(RegisterPage);

    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(store.register).not.toHaveBeenCalled();

    store.loading = false;
    await nextTick();

    expect(mocks.router.replace).toHaveBeenCalledWith("/categoria/joyas");
    expect(store.register).not.toHaveBeenCalled();
  });

  it("usa la raíz cuando el retorno no es local o apunta a autenticación", () => {
    mocks.route.query.returnUrl = "https://evil.example/steal";
    mount(RegisterPage);

    expect(mocks.store.register).toHaveBeenCalledWith("/");
  });

  it("muestra el error del redirect sin repetirlo y permite reintentar", async () => {
    const store = reactive(mocks.store);
    store.register.mockImplementation(async () => {
      store.error = null;
      store.loading = true;
      await Promise.resolve();
      store.loading = false;
      store.error = "No se pudo abrir el registro. Inténtalo de nuevo.";
    });
    const wrapper = mount(RegisterPage);

    await flushPromises();

    expect(store.register).toHaveBeenCalledOnce();
    expect(wrapper.get('[role="alert"]').text()).toContain("No se pudo abrir el registro");
    expect(wrapper.get("button").text()).toContain("Reintentar");

    await wrapper.get("button").trigger("click");

    expect(store.register).toHaveBeenCalledTimes(2);
  });
});
