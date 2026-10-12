import { h, defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingNavbar from "./LandingNavbar.vue";

const authStore = vi.hoisted(() => ({
  authenticated: false,
  hasAnyRole: vi.fn(),
  signout: vi.fn(),
}));

const darkMode = vi.hoisted(() => ({
  isDark: false,
  toggle: vi.fn(),
}));

vi.mock("@/stores/authStore", () => ({
  ADMIN_ROLES: ["admin", "AdminAniaIdentity"],
  useAuthStore: () => authStore,
}));

vi.mock("@/composables/useDarkMode", () => ({
  useDarkMode: () => darkMode,
}));

vi.mock("vue-router", () => ({
  RouterLink: defineComponent({
    name: "RouterLink",
    inheritAttrs: false,
    props: {
      to: { type: [String, Object], required: true },
    },
    setup(props, { slots }) {
      return () =>
        h(
          "a",
          { href: typeof props.to === "string" ? props.to : props.to.path },
          slots.default?.(),
        );
    },
  }),
  useRoute: () => ({ path: "/" }),
}));

const mountNavbar = () => mount(LandingNavbar);

const buttonsWithText = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll("button").filter((button) => button.text().trim() === text);

beforeEach(() => {
  authStore.authenticated = false;
  authStore.hasAnyRole.mockReset().mockReturnValue(false);
  authStore.signout.mockReset();
  darkMode.isDark = false;
  darkMode.toggle.mockReset();
});

describe("LandingNavbar authentication actions", () => {
  it("shows login and registration links for anonymous users", () => {
    const wrapper = mountNavbar();

    expect(wrapper.findAll('a[href="/login"]')).toHaveLength(2);
    expect(wrapper.findAll('a[href="/register"]')).toHaveLength(2);
    expect(wrapper.text()).not.toContain("Admin");
    expect(buttonsWithText(wrapper, "Cerrar sesión")).toHaveLength(0);
  });

  it("shows only the logout action for an authenticated buyer", async () => {
    authStore.authenticated = true;
    authStore.hasAnyRole.mockReturnValue(false);
    const wrapper = mountNavbar();

    expect(wrapper.findAll('a[href="/login"]')).toHaveLength(0);
    expect(wrapper.findAll('a[href="/register"]')).toHaveLength(0);
    expect(wrapper.text()).not.toContain("Admin");
    expect(buttonsWithText(wrapper, "Cerrar sesión")).toHaveLength(2);

    await buttonsWithText(wrapper, "Cerrar sesión")[0]!.trigger("click");
    expect(authStore.signout).toHaveBeenCalledOnce();
  });

  it("shows the admin link and logout action for an authenticated admin", () => {
    authStore.authenticated = true;
    authStore.hasAnyRole.mockReturnValue(true);
    const wrapper = mountNavbar();

    expect(wrapper.findAll("a").filter((link) => link.text().trim() === "Admin")).toHaveLength(2);
    expect(wrapper.findAll('a[href="/login"]')).toHaveLength(0);
    expect(wrapper.findAll('a[href="/register"]')).toHaveLength(0);
    expect(buttonsWithText(wrapper, "Cerrar sesión")).toHaveLength(2);
  });
});
