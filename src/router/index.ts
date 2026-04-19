import { createRouter, createWebHistory } from "vue-router";
import WelcomePage from "../views/WelcomeView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "welcome",
      component: WelcomePage,
    },
    {
      path: "/admin/components",
      name: "admin-components",
      component: () => import("@/pages/admin/components.vue"),
      beforeEnter: (to, from, next) => {
        const isAdmin = true;
        if (isAdmin) {
          next();
        } else {
          next("/");
        }
      },
    },
    {
      path: "/admin/components/new",
      name: "admin-components-new",
      component: () => import("@/views/ComponenteCreateView.vue"),
      beforeEnter: (to, from, next) => {
        const isAdmin = true;
        if (isAdmin) {
          next();
        } else {
          next("/");
        }
      },
    },
    {
      path: "/admin/components/edit/:id",
      name: "admin-components-edit",
      component: () => import("@/views/ComponentEditView.vue"),
      beforeEnter: (to, from, next) => {
        const isAdmin = true;
        if (isAdmin) {
          next();
        } else {
          next("/");
        }
      },
    },
    {
      path: "/about",
      name: "about",
      component: () => import("@/views/AboutView.vue"),
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/pages/auth/login.vue"),
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/pages/auth/register.vue"),
    },
    {
      path: "/forgot-password",
      name: "forgot-password",
      component: () => import("@/pages/auth/forgot-password.vue"),
    },
    {
      path: "/admin/dashboard",
      name: "dashboard",
      component: () => import("@/pages/dashboard.vue"),
    },
    {
      path: "/settings/profile",
      name: "profile",
      component: () => import("@/pages/settings/profile.vue"),
    },
    {
      path: "/admin/products",
      name: "admin-products",
      component: () => import("@/pages/admin/products.vue"),
      beforeEnter: (to, from, next) => {
        const isAdmin = true;
        if (isAdmin) {
          next();
        } else {
          next("/");
        }
      },
    },
    {
      path: "/admin/products/edit/:id",
      name: "admin-product-edit",
      component: () => import("@/views/ProductEditView.vue"),
      beforeEnter: (to, from, next) => {
        const isAdmin = true;
        if (isAdmin) {
          next();
        } else {
          next("/");
        }
      },
    },
    {
      path: "/admin/products/new",
      name: "admin-products-new",
      component: () => import("@/views/ProductCreateView.vue"),
      beforeEnter: (to, from, next) => {
        const isAdmin = true;
        if (isAdmin) {
          next();
        } else {
          next("/");
        }
      },
    },
    {
      path: "/admin/products/:id/orders",
      name: "admin-product-orders",
      component: () => import("@/views/ProductOrderHistoryView.vue"),
      beforeEnter: (to, from, next) => {
        const isAdmin = true;
        if (isAdmin) {
          next();
        } else {
          next("/");
        }
      },
    },
  ],
});

router.beforeEach((to, from, next) => {
  const doc = document as Document & {
    startViewTransition?: (callback: () => Promise<void> | void) => void;
  };

  if (!doc.startViewTransition || to.path === from.path) {
    next();
    return;
  }

  doc.startViewTransition(async () => {
    next();
  });
});

export default router;
