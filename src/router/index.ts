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
      path: "/admin",
      name: "admin",
      component: () => import("@/pages/admin/AdminDashboardLayout.vue"),
      redirect: "/admin/products",
      children: [
        {
          path: "",
          redirect: "/admin/products",
        },
        {
          path: "products",
          name: "admin-products",
          component: () => import("@/components/dashboard/list-products.vue"),
        },
        {
          path: "products/edit/:id",
          name: "admin-product-edit",
          component: () => import("@/views/ProductEditView.vue"),
        },
        {
          path: "products/new",
          name: "admin-products-new",
          component: () => import("@/views/ProductCreateView.vue"),
        },
        {
          path: "products/:id/orders",
          name: "admin-product-orders",
          component: () => import("@/views/ProductOrderHistoryView.vue"),
        },
        {
          path: "products/:id/orders/new",
          name: "admin-product-order-create",
          component: () => import("@/views/OrderCreateView.vue"),
        },
        {
          path: "products/:id/orders/:pedidoId",
          name: "admin-product-order-detail",
          component: () => import("@/views/OrderDetailView.vue"),
        },
        {
          path: "solicitudes",
          name: "admin-solicitudes",
          component: () => import("@/views/SolicitudesView.vue"),
        },
        {
          path: "orders",
          name: "admin-orders",
          component: () => import("@/views/OrdersHistoryView.vue"),
        },
        {
          path: "orders/:pedidoId",
          name: "admin-order-detail",
          component: () => import("@/views/OrderDetailView.vue"),
        },
        {
          path: "agenda/emergencias/:id",
          name: "admin-agenda-emergencia",
          component: () => import("@/views/EmergenciaDetalleView.vue"),
        },
        {
          path: "agenda",
          name: "admin-agenda",
          component: () => import("@/views/AgendaView.vue"),
        },
        {
          path: "components",
          name: "admin-components",
          component: () => import("@/pages/admin/components.vue"),
        },
        {
          path: "components/new",
          name: "admin-components-new",
          component: () => import("@/views/ComponenteCreateView.vue"),
        },
        {
          path: "components/edit/:id",
          name: "admin-components-edit",
          component: () => import("@/views/ComponentEditView.vue"),
        },
      ],
    },
    {
      path: "/categoria/:slug",
      name: "category-catalog",
      component: () => import("@/views/CategoryCatalogView.vue"),
    },
    {
      path: "/categoria/:slug/producto/:id",
      name: "producto-detalle",
      component: () => import("@/views/ProductoDetalleView.vue"),
    },
    {
      path: "/pedido",
      name: "pedido-wizard",
      component: () => import("@/views/PedidoWizardView.vue"),
    },
    {
      path: "/pedido/seguimiento/:token",
      name: "pedido-seguimiento",
      component: () => import("@/views/PedidoSeguimientoView.vue"),
    },
    {
      path: "/pedido/confirmacion/:ref",
      name: "pedido-confirmacion",
      component: () => import("@/views/PedidoConfirmacionView.vue"),
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
