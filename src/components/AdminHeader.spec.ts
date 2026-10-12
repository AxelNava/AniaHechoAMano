import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AdminHeader from "./AdminHeader.vue";

const store = vi.hoisted(() => ({
  profile: { name: "Ana Administradora", email: "ana@example.com" },
  loading: false,
  error: null as string | null,
  signout: vi.fn(),
}));
vi.mock("@/stores/authStore", () => ({ useAuthStore: () => store }));
vi.mock("vue-router", () => ({ useRoute: () => ({ path: "/admin/products" }) }));

describe("AdminHeader", () => {
  it("muestra perfil mínimo e inicia el logout OIDC sin tokens", async () => {
    const wrapper = mount(AdminHeader, {
      global: {
        stubs: {
          RouterLink: {
            props: ["to"],
            template: '<a :href="to"><slot /></a>',
          },
          DarkModeToggle: true,
        },
      },
    });
    expect(wrapper.text()).toContain("Ana Administradora");
    expect(wrapper.text()).toContain("ana@example.com");
    expect(wrapper.find('a[href="/settings/profile"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("token");
    await wrapper.get('button[aria-label="Cerrar sesión"]').trigger("click");
    expect(store.signout).toHaveBeenCalledOnce();
  });
});
