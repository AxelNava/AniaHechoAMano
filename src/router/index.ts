import { createRouter, createWebHistory } from "vue-router";
import WelcomePage from "../views/WelcomeView.vue";
import { ADMIN_ROLES, BUYER_ROLE } from "@/stores/authStore";
import { createAuthGuard } from "./authGuard";

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
      meta: { requiresAuth: true, roles: ADMIN_ROLES },
      children: [
        {
          path: "products",
          name: "admin-products",
          component: () => import("@/components/dashboard/list-products.vue"),
        },
        {
          path: "products/import",
          name: "admin-products-import",
          component: () => import("@/views/ProductImportView.vue"),
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
      // El wizard acepta pedidos públicos, pero conserva el rol de comprador
      // (y el acceso administrativo) cuando la sesión sí está autenticada.
      meta: {
        requiresAuth: true,
        allowAnonymous: true,
        roles: [BUYER_ROLE, ...ADMIN_ROLES],
      },
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
      path: "/auth/callback",
      name: "auth-callback",
      component: () => import("@/pages/auth/callback.vue"),
    },
    {
      path: "/auth/logout-callback",
      name: "auth-logout-callback",
      component: () => import("@/pages/auth/logout-callback.vue"),
    },
    {
      path: "/sin-permisos",
      name: "forbidden",
      component: () => import("@/pages/auth/forbidden.vue"),
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/pages/auth/register.vue"),
    },
    { path: "/forgot-password", redirect: { name: "login" } },
    {
      path: "/admin/dashboard",
      name: "dashboard",
      component: () => import("@/pages/dashboard.vue"),
      meta: { requiresAuth: true, roles: ADMIN_ROLES },
    },
    {
      path: "/settings/profile",
      name: "profile",
      component: () => import("@/pages/settings/profile.vue"),
      meta: { requiresAuth: true, roles: ADMIN_ROLES },
    },
  ],
});

router.beforeEach(createAuthGuard());

export const viewTransitionGuard = (
  to: { path: string },
  from: { path: string },
): true | Promise<true> => {
  const doc = document as Document & {
    startViewTransition?: (callback: () => Promise<void> | void) => void;
  };

  if (!doc.startViewTransition || to.path === from.path) return true;

  return new Promise((resolve) => {
    doc.startViewTransition?.(() => resolve(true));
  });
};

router.beforeEach(viewTransitionGuard);

export default router;
