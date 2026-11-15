# Integrar cambios remotos

Objetivo: integrar origin/feature/product-layout-and-details y preservar diferencias funcionales de los cambios locales.

Restricciones: no perder cambios locales; mantener funcionalidades remotas; comprobar especialmente el tratamiento del token de seguimiento. No publicar.

- [x] T1: Guardar los cambios locales en un commit recuperable: `26c974a`.
- [x] T2: Integrar los cambios remotos y resolver conflictos conservando funcionalidades distintas. Merge `d8f8e56`; árbol limpio; rama al día con `origin/feature/product-layout-and-details` (0 detrás).
- [x] T3: Verificar tipos, lint y pruebas pertinentes: `bun run type-check` sin errores y 120/120 pruebas unitarias (18 archivos). No se ejecutaron E2E ni build.

## Evidencia del merge (`d8f8e56`)

- 7 conflictos resueltos: `.gitignore`, `src/__tests__/PedidoSeguimientoView.spec.ts`, `src/__tests__/disponibilidadApi.spec.ts`, `src/services/orders/ordersApi.ts`, `src/types/orders/orderHistoryDto.ts`, `src/views/PedidoSeguimientoView.vue`, `src/views/PedidoWizardView.vue`.
- Criterio de resolución: se conservaron las diferencias funcionales locales — `parseApiError` en `createOrderPublico`, `PedidoCreadoPublicoDto`, token de seguimiento solo en memoria (`pedidoClienteStore`) y `estado: EstadoPedido` en el historial — junto con todo lo remoto (design docs, e2e, agenda y emergencias). Sin marcadores de conflicto en el árbol.

## Entorno de pruebas

Node 26 define un `localStorage` global experimental que tapa el de jsdom: `bun run test:unit` falla 11 pruebas (3 archivos) con `Cannot read properties of undefined (reading 'clear')`, y una de ellas es un spec que este merge no toca. Con `NODE_OPTIONS='--localstorage-file=/tmp/ls.dat' bun run test:unit` pasan 120/120. No es una regresión del merge; queda como arreglo de toolchain pendiente (declarar el flag en el script o fijar la versión de Node).

## Estado de entrega

Slice acumulado: 420 líneas autoradas en 2 commits sobre `origin/main`. Estrategia de entrega (push / PR) no ejecutada: es decisión del usuario.

Revisión nativa: **aprobada** (`review-bc519352616a7602`, candidato acotado `06aa4ea..HEAD`, tier medium, lentes risk/resilience/reliability, 446 líneas). Autoridad consumida al acusar recibo. Ocho hallazgos informativos, ninguno bloqueante ni con transición de corrección abierta:

- `R1-scrub-write-snapshot-loss` (risk, WARNING) — `src/stores/pedidoClienteStore.ts:60-66`
- `R3-reliability-dual-apierror-classes` (reliability, SUGGESTION) — `src/services/http/apiError.ts:7-13`
- `R3-reliability-node26-localstorage-tests` (reliability, WARNING) — confirma la nota de entorno de arriba
- `R3-reliability-problemdetail-message-change` (SUGGESTION) y `R3-reliability-publicrequest-null-cast` (SUGGESTION) — `src/services/disponibilidad/disponibilidadApi.ts:23-24,38`
- `R3-reliability-unhandled-apierror-callers` (WARNING) y `R4-public-request-silent-null` (WARNING) — `src/services/disponibilidad/disponibilidadApi.ts:26-39`
- `R4-store-migration-state-loss` (WARNING) — `src/stores/pedidoClienteStore.ts:60-66`

Los hallazgos son trabajo posterior independiente, nunca motivo para repetir la revisión de este candidato.

Espejo Engram: pendiente para esta actualización.
