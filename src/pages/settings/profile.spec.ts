import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "./profile.vue";

const mocks = vi.hoisted(() => ({
  manageUrl: "https://identity.example/Manage" as string | null,
  store: {
    profile: {
      name: "Ana Administradora",
      email: "ana@example.com",
    },
  },
}));

vi.mock("@/auth/oidcClient", () => ({
  buildManageUrl: vi.fn(() => mocks.manageUrl),
}));
vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => mocks.store,
}));
vi.mock("@/stores/appStore", () => ({
  useAppStore: () => ({ user: null }),
}));

describe("perfil", () => {
  beforeEach(() => {
    mocks.manageUrl = "https://identity.example/Manage";
    mocks.store.profile = {
      name: "Ana Administradora",
      email: "ana@example.com",
    };
  });

  const mountPage = () =>
    mount(ProfilePage, {
      global: {
        stubs: {
          AppLayout: { template: "<main><slot /></main>" },
          SettingsLayout: { template: "<section><slot /></section>" },
        },
      },
    });

  it("muestra las claims actuales como información de solo lectura y enlaza a Manage", () => {
    const wrapper = mountPage();

    expect(wrapper.text()).toContain("Ana Administradora");
    expect(wrapper.text()).toContain("ana@example.com");
    expect(wrapper.find("form").exists()).toBe(false);
    expect(wrapper.find("input").exists()).toBe(false);
    expect(wrapper.find("button").exists()).toBe(false);

    const manageLink = wrapper.get('a[href="https://identity.example/Manage"]');
    expect(manageLink.text()).toContain("Administrar nombre y correo");
    expect(manageLink.attributes("target")).toBeUndefined();
  });

  it("explica honestamente cuando Manage no tiene una URL segura disponible", () => {
    mocks.manageUrl = null;

    const wrapper = mountPage();

    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.text()).toContain("no está disponible");
    expect(wrapper.text()).not.toContain("Administrar nombre y correo");
  });
});
