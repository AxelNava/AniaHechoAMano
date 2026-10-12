import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ForbiddenPage from "./forbidden.vue";

const store = vi.hoisted(() => ({
  loading: false,
  error: null as string | null,
  signout: vi.fn(),
}));
vi.mock("@/stores/authStore", () => ({ useAuthStore: () => store }));

describe("sin permisos", () => {
  it("explica el 403, conserva la sesión y permite cambiar de cuenta", async () => {
    const wrapper = mount(ForbiddenPage, {
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
    });
    expect(wrapper.text()).toContain("No tienes permisos");
    expect(wrapper.text()).toContain("Volver al inicio");
    await wrapper.get("button").trigger("click");
    expect(store.signout).toHaveBeenCalledOnce();
  });
});
