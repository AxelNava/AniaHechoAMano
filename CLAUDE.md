# CLAUDE.md — AniaHechoAMano (frontend)

SPA del negocio artesanal **Ania Hecho a Mano**: catálogo público por categorías (piñatas, postres, adornos, sublimación, desayunos, creativos) + panel de administración de productos, pedidos y componentes. Todo el código y la UI están en **español**.

> Idioma de trabajo: **español**.
> Repo **independiente** del backend (`../AniaHechoAManoBackend`). Se comunica con él por API REST bajo `/api`.

## Reglas de agente (ya definidas — respétalas)

Estas reglas ya viven en `.junie/agents.md` y aplican también aquí:

1. **Gestor de paquetes: `bun`** (NO npm/yarn/pnpm). Todo con bun: `bun install`, `bun run dev`, `bun add <paquete>`.
2. **Extracción de componentes**: extrae un componente nuevo **solo cuando una sección de estilos/estructura se repite más de 3 veces**, y **pregunta antes** de hacer esa refactorización.
3. **Skill obligatoria de Vue**: para cualquier tarea de Vue, usar la skill `.agents/skills/vue-best-practices/` (Composition API + `<script setup lang="ts">` por defecto, data flow props↓/events↑, composables, etc.). Léela antes de escribir componentes.

## Stack

- **Vue 3.5** (Composition API, `<script setup lang="ts">`) — SPA, sin SSR
- **TypeScript 6** strict · alias `@/*` → `src/*`
- **Vite 8** · **Tailwind CSS 4** (plugin de Vite, sin `tailwind.config` clásico)
- Componentes **shadcn-vue** sobre **radix-vue** en `src/components/ui/`
- **Pinia 3** (estado) · **Vue Router 5** (`createWebHistory`, lazy-loading, view transitions)
- Utilidades: `class-variance-authority`, `clsx`, `tailwind-merge`, `@vueuse/core`, iconos `lucide-vue-next`, toasts `vue-sonner`
- Tests: **Vitest 4** (unit, jsdom) + **Playwright** (E2E, Chromium, `e2e/`)
- Lint: **oxlint** + **ESLint 10** + Prettier

## Comandos (bun)

```bash
bun install
bun dev              # vite dev server (:5173)
bun run build        # type-check + vite build
bun run type-check   # vue-tsc --noEmit
bun run test:unit    # vitest
bun run test:e2e     # playwright test
bun lint             # oxlint + eslint (--fix)
bun run format       # prettier --write src/
```

## Estructura (`src/`)

- `pages/` — páginas por ruta: `admin/`, `auth/`, `settings/profile`, `dashboard`.
- `views/` — vistas de ruta (grueso de la lógica de pantalla): catálogo público, productos, pedidos, componentes.
- `components/` — `ui/` (design system shadcn), `base/` (Heading/Buttons), `dashboard/` (tablas de datos, filtros, gestor de imágenes), header/footer/navbar.
- `layouts/` — `AppLayout`, `AdminDashboardLayout`, `AuthLayout`, `ProductLayout`, `SettingsLayout`.
- `stores/` — Pinia: `appStore` (user, sidebar, flags en localStorage), `categoriesStore`, `componentsStore`.
- `services/` — clientes API por dominio (ver abajo).
- `composables/` — `useFetch`, `useDarkMode`, `useLoadingButton`, `orders/useOrderForm`, `products/useProductImages`.
- `types/` — DTOs por dominio (`products/`, `orders/`, `categories/`) — **frontera de tipos con el backend, mantenida a mano**.
- `config/catalog.ts` — mapea slugs públicos de URL → nombre de categoría del backend.
- `router/index.ts`, `lib/utils.ts`, `plugins/async-promise-loading.ts`.

## Conexión con el backend

- **URL base**: `import.meta.env.VITE_VUE_APP_DOMAIN || "http://localhost:5001"`, luego `` `${apiBackend}/api` ``. (Nota: el fallback histórico apunta a `:5001`; el backend por defecto escucha en `:3001` — verifica `VITE_VUE_APP_DOMAIN` en tu `.env`.)
- **Cliente HTTP**: wrapper propio `composables/useFetch.ts` sobre **Fetch nativo** (NO axios). Devuelve `null` y loguea en error. Subidas de imágenes con `fetch` + `FormData` directo (sin `Content-Type: application/json`).
- **Servicios** (`src/services/`, en su mayoría clases): `products/` (`productApi` implementa `IProductApi`, `catalogApi`, `categoryProductsApi`, `componentsApi`), `orders/ordersApi`, `categories/categoriesApi`, `clientes/clientesApi`, `history/`.
- **Contrato**: los DTOs de `src/types/` reflejan a mano los del backend (`PaginatedResponseDto` con `data` + `meta`, etc.). **No hay generación automática** — si cambia un DTO en el backend, actualízalo aquí manualmente.

## Config de IA presente

- `.agents/skills/vue-best-practices/` — skill de Vue (v18.0.0, `vuejs-ai`), ~22 docs de referencia. **Fuente de verdad para tareas de Vue.**
- `.junie/agents.md` — reglas del agente (arriba). `.junie/skills/vue-best-practices` es un symlink a la skill de `.agents/`. `.junie/memory/` guarda preferencias (idioma `es`).
- `.aiignore` — la IA ignora `.DS_Store`, `*.log`, `*.tmp`, `dist/`, `build/`, `out/`, `.env`.

## Deuda técnica y trampas conocidas

- **Solapamiento `pages/` vs `views/`**: ambas carpetas tienen pantallas y no hay una frontera clara. Al crear una pantalla nueva, sigue el patrón de la feature vecina y no dupliques.
- **`AdminDashboardLayout` duplicado**: existe en `layouts/` y en `pages/admin/`. Confirma cuál usa el router antes de editar.
- **Carpeta `backup/`**: contiene la versión anterior **en React/JSX** (migración React→Vue). Está fuera del lint — **no la toques ni la uses como referencia de estilo actual**.
- **`stores/counter.ts`**: store demo del scaffold, sin uso real.
- **Piezas de IA a medio armar**: `SKILL.md` (raíz) es solo una **plantilla sin rellenar**; `.ai/mcp/mcp.json` está **vacío** (sin servidores MCP); la memoria de Junie casi vacía.
- **Inconsistencia de gestor**: la política es bun, pero `playwright.config.ts` usa `pnpm run dev` en su `webServer.command`.
- **Auth es scaffolding**: hay páginas de login/register/forgot-password, pero el backend aún **no implementa autenticación**.

## Al terminar un cambio

Ejecuta `bun run type-check` y `bun lint`. Añade/actualiza tests con Vitest cuando aplique. Si tocaste un contrato de API, sincroniza el DTO correspondiente en `src/types/`.
