import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CallbackPage from "./callback.vue";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  store: { error: null as string | null, signinCallback: vi.fn() },
}));
vi.mock("vue-router", () => ({
  useRouter: () => mocks.router,
  RouterLink: { template: "<a><slot /></a>" },
}));
vi.mock("@/stores/authStore", () => ({ useAuthStore: () => mocks.store }));

describe("callback OIDC", () => {
  beforeEach(() => {
    mocks.store.error = null;
    vi.clearAllMocks();
  });
  it("completa el callback y restaura el retorno", async () => {
    mocks.store.signinCallback.mockResolvedValue("/pedido?paso=2");
    mount(CallbackPage);
    await flushPromises();
    expect(mocks.router.replace).toHaveBeenCalledWith("/pedido?paso=2");
  });
  it("ofrece recuperación accesible cuando falla", async () => {
    mocks.store.error = "No se pudo completar el inicio de sesión. Inténtalo de nuevo.";
    mocks.store.signinCallback.mockRejectedValue(new Error("fallo"));
    const wrapper = mount(CallbackPage);
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("Inténtalo de nuevo");
    expect(wrapper.text()).toContain("Reintentar");
    expect(wrapper.text()).toContain("Volver al inicio");
  });
});
