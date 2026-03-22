import { createRouter, createWebHistory } from 'vue-router'
import WelcomePage from '../views/WelcomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'welcome',
      component: WelcomePage,
    },
    {
      path: '/componentes/create',
      name: 'componente-create',
      component: () => import('../views/ComponenteCreateView.vue'),
    },
    // {
    //   path: '/detalles/:category/:id',
    //   name: 'product-detail',
    //   component: () => import('../views/ProductDetailView.vue'),
    // },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/auth/login.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../pages/auth/register.vue'),
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../pages/auth/forgot-password.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../pages/dashboard.vue'),
    },
    {
      path: '/settings/profile',
      name: 'profile',
      component: () => import('../pages/settings/profile.vue'),
    },
  ],
})

router.beforeEach((to, from, next) => {
  const doc = document as Document & {
    startViewTransition?: (callback: () => Promise<void> | void) => void
  }

  if (!doc.startViewTransition || to.path === from.path) {
    next()
    return
  }

  doc.startViewTransition(async () => {
    next()
  })
})

export default router
