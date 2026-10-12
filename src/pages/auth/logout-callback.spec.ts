import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LogoutCallbackPage from "./logout-callback.vue";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  store: { error: null as string | null, signoutCallback: vi.fn() },
}));
vi.mock("vue-router", () => ({
  useRouter: () => mocks.router,
  RouterLink: { template: "<a><slot /></a>" },
}));
vi.mock("@/stores/authStore", () => ({ useAuthStore: () => mocks.store }));

describe("logout callback", () => {
  beforeEach(() => {
    mocks.store.error = null;
    vi.clearAllMocks();
  });
  it("limpia la sesión y reemplaza al inicio", async () => {
    mocks.store.signoutCallback.mockResolvedValue(undefined);
    mount(LogoutCallbackPage);
    await flushPromises();
    expect(mocks.store.signoutCallback).toHaveBeenCalledOnce();
    expect(mocks.router.replace).toHaveBeenCalledWith("/");
  });
  it("mantiene una salida recuperable si falla", async () => {
    mocks.store.error = "No se pudo completar el cierre de sesión. Inténtalo de nuevo.";
    mocks.store.signoutCallback.mockResolvedValue(undefined);
    const wrapper = mount(LogoutCallbackPage);
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("Inténtalo de nuevo");
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
});
