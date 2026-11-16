# Chatbot de atención al cliente con agente de IA

Feature grande, multi-repositorio (frontend Vue, backend NestJS, identidad Duende).
Cada tarea indica el repo y el commit que la contiene como evidencia.

## Specs

S1 — El bot atiende consultas de precios, tiempos de espera y demoras.
> "su principal función será atender al cliente en cuento a precios, tiempoes de espera, demoras"

S2 — Es un agente que atiende como la administradora y puede aceptar pedidos.
> "que sea un agente de IA, que pueda atender a los clientes de la misma forma que la administradora, que pueda aceptar pedidos"

S3 — Maneja los tiempos cuando el pedido es grande.
> "manejar tiempos en caso de que sea un pedido grande"

S4 — Consulta precios sin revelar el precio final.
> "consultar precios (sin revelar el precio final)"

S5 — Da presupuestos aproximados en forma de rango.
> "hacer presupuestos aproximados (un rango)"

S6 — Un pedido personalizado que no está en el catálogo se cotiza: busca productos registrados y promedia para dar el rango.
> "luego los clientes quieren algo personalizado y no tenemos lo que quieren así que se hace una cotización, esto involucra buscar los productos, si no están registrados en la web de forma eficiente y haciendo un promedio, para dar un rango al final"

S7 — Los datos que consume el bot viven en la base de datos.
> "será necesario tener en base de datos ya los datos, se pueden inventar"

S8 — Sólo usuarios logueados pueden comunicarse.
> "los usuarios deben de estar logueados para poder comunicarse con el administrador"

S9 — El chatbot es una burbuja que se puede ocultar y mover por la UI.
> "el chatbot puede ocultarse, moverse al al rededor de la UI (web) como si fuera una burbuja"

S10 — Responde de forma dinámica.
> "responda de forma dinamica"

Decisiones del humano (respondidas el 2026-11-09):

S11 — Se arregla el login OIDC del SPA antes del bot.
> "Arreglar OIDC primero (recomendado)"

S12 — El proveedor de LLM es Google Gemini.
> "Google Gemini"

S13 — La primera entrega incluye consulta, cotización de personalizados y alta de pedido.
> "Todo: consulta + cotización custom + alta de pedido"

S14 — El rango sale de un motor determinista con análogos y margen; el LLM no calcula precios.
> "Motor determinista con análogos y margen"

## Tasks

| ID | Specs | Repo | Ruta | Commit |
| -- | ----- | ---- | ---- | ------ |
| T1 | S11 | frontend | inline | `73a6807`, `8830415` |
| T2 | S8, S11 | AniaIdentity | inline | verificado en vivo (L10) |
| T3 | S4, S5, S6, S14 | backend | worker | — |
| T4 | S7, S14 | backend | inline | — |
| T5 | S1, S10, S12, S14 | backend | worker | — |
| T6 | S7 | backend | inline | — |
| T7 | S1, S10 | backend | inline | — |
| T8 | S8, S9 | frontend | worker | — |
| T9 | S2, S3 | backend | inline | — |
| T10 | S5, S6 | backend | inline | — |
| T11 | S2, S8 | backend + frontend | inline | — |
| T12 | todas | ambos | verify | — |

### Detalle

- **T1 · Sesión real en el SPA.** Instalar `oidc-client-ts`, agregar rutas `/auth/callback` y
  `/auth/logout-callback`, store de sesión con renovación, inyección de `Authorization: Bearer`
  en `apiClient.ts` y en los servicios que hoy usan `fetch` crudo, guard de ruta y reemplazo del
  `submit` falso de `pages/auth/login.vue`. Unificar la base de API (hoy `:5001` por defecto en 5
  módulos y el backend escucha en `:3001`).
- **T2 · STS operativo.** Provisionar PostgreSQL de identidad, correr migraciones y seed
  (`ApplySeed`/`ApplyDatabaseMigrations` están apagados), definir qué rol recibe un cliente nuevo
  (hoy el registro crea usuarios sin rol y el backend responde `insufficient_permissions`).
- **T3 · Motor de rangos.** `calcularRangoProducto(productoId)` y
  `calcularRangoPersonalizado(brief)`: costo de receta vigente, margen por categoría calibrado
  desde `precio_base / costo_receta` de los productos reales, análogos por categoría/componentes/
  tags, promedio ponderado, factores de complejidad, redondeo, y mínimo de dos análogos o deriva.
  El resultado nunca incluye costo por componente.
- **T4 · Configuración del bot.** Migración Prisma para márgenes por categoría, redondeo, tarifa
  de mano de obra, horario de atención y topes de uso; módulo NestJS que los expone.
- **T5 · Agente.** Orquestador con tool-calling sobre Gemini y tools deterministas
  (`buscarProductos`, `calcularRango`, `consultarDisponibilidad`, `crearSolicitud`,
  `escalarAHumano`). El modelo recibe sólo rangos ya calculados, nunca costos.
- **T6 · Persistencia.** Migración para `conversaciones`, `mensajes`, `cotizaciones_borrador`.
- **T7 · Endpoint del bot.** `POST /api/bot/mensajes` con streaming SSE, throttler, tope de
  tokens y detección de pedido de atención humana.
- **T8 · Burbuja.** Componente flotante arrastrable (`useDraggable`), posición en `localStorage`,
  ocultable, visible sólo en rutas públicas y sólo con sesión.
- **T9 · Alta de pedido desde el chat.** Reusar `POST /api/pedidos/solicitud-autenticada` con
  `es_modificacion` para caer en `COTIZANDO`, y `GET /api/disponibilidad/dias` +
  `POST /evaluar` para tiempos y demoras.
- **T10 · Cotización en borrador.** Persistir el rango con vencimiento y escribirlo en
  `productos_pedido.precio_estimado_ia` al crear la solicitud.
- **T11 · Derivación a humano.** Estado `HANDOFF`, aviso a la administradora y panel admin para
  leer conversaciones.
- **T12 · Verificación.** Ejemplos de cada `S#` de punta a punta: consulta de precio existente,
  personalizado con análogos, personalizado sin análogos, pedido grande, demora, conversación sin
  sesión.

## Log

L1 — Pedido original (verbatim):
> Vamos a implementar una nueva feature, que tiene que ver con un chatbot, su principal función será atender al cliente en cuento a precios, tiempoes de espera, demoras, etc, la idea completa es que sea un agente de IA, que pueda atender a los clientes de la misma forma que la administradora, que pueda aceptar pedidos, manejar tiempos en caso de que sea un pedido grande, consultar precios (sin revelar el precio final), hacer presupuestos aproximados (un rango) con tal de que el cliente esté lo más cerca del administrador pero sin que este tenga que delegar su tiempo en atender a un sin fin de clientes. Para esto será necesario tener en base de datos ya los datos, se pueden inventar, para esto, los usuarios deben de estar logueados para poder comunicarse con el administrador, el chatbot puede ocultarse, moverse al al rededor de la UI (web) como si fuera una burbuja. Primero, ¿qué es lo que se necesita para poder lograr obtener esto? porque quiero que el chatbot consulte precios, responda de forma dinamica porque luego los clientes quieren algo personalizado y no tenemos lo que quieren así que se hace una cotización, esto involucra buscar los productos, si no están registrados en la web de forma eficiente y haciendo un promedio, para dar un rango al final, etc

L2 — Decisiones de alcance (cuestionario del 2026-11-09): OIDC primero; Gemini; entrega 1
completa; motor determinista con análogos y margen.

L4 — Límite de slice de trabajo (2026-11-14): el work unit anterior (pedidos públicos +
seguimiento) cerró con revisión nativa aprobada y merge en `f50eb2c`; el registro del plan de
esta feature es el commit `d86c5ab` (docs). T1 arranca un slice nuevo en
`feature/product-layout-and-details`.

L3 — Hallazgos de exploración que condicionan el diseño:
- El schema ya tiene `productos_pedido.precio_estimado_ia` sin uso, `es_modificacion` y
  `categoria_producto_base_id`: la cotización por IA estaba prevista.
- `CosteoService` calcula costo y minutos, pero `precio_sugerido` es igual a `precio_base`: no
  existe margen en el schema.
- `GET /api/disponibilidad/dias` y `POST /evaluar` son públicos y ya resuelven lead time,
  capacidad y bloqueos: el bot los reusa en lugar de calcular fechas.
- `POST /api/pedidos/solicitud-autenticada` decide `COTIZANDO` cuando alguna línea tiene
  `es_modificacion: true`.
- El SPA no manda `Authorization` en ninguna request y `/login` es un stub con `setTimeout`.
- El STS Duende existe y compila con .NET 10, pero su base de datos no está provisionada y el
  seed está apagado por configuración.

L5 — Decisión sobre el identity (2026-11-14): no se revisa ni se modifica AniaIdentity desde el
frontend; los usuarios ya existen y, si falta uno activo, se crea mediante el panel de
administración. T1 entrega además un sistema de tests que permita evaluar el login (unit con
mocks + E2E real configurable contra el STS, que se salta si no está disponible). Hallazgo que
motiva la decisión: `appsettings.Development.json` del STS conserva los placeholders
`PASTE_HOST_NEON` en las 4 connection strings (el DNS de la máquina resuelve bien; el discovery
en `https://localhost:44310` responde 500 por eso).

L6 — Cierre T1 (2026-11-14, commits `73a6807` y `8830415`):
- Núcleo: `src/config/api.ts` (base única, fallback `:3001`), `src/config/oidc.ts`,
  `src/auth/oidcUserManager.ts` (PKCE, silent renew, usuario en `sessionStorage`),
  `src/stores/authStore.ts` (init idempotente, `getAccessToken` con renovación),
  `src/auth/authHeaders.ts` (Bearer solo con sesión), callbacks `/auth/*`, guard de rutas y
  login real. `oidc-client-ts@3.5.0` añadido con bun.
- Defecto encontrado por E2E: un guard async con `next` dispara «Invalid navigation guard» de
  vue-router cuando `next()` no se llama antes de resolver la promesa (`guard.length > 2`);
  con `startViewTransition` el `next()` llegaba tarde. Solución: guard de auth async con valor
  de retorno y guard sync de view transitions separados; suite pública 31/31 tras el fix.
- Regresión capturada y corregida durante el cableado: sin sesión se inyectaba `headers: {}`
  donde antes no había header; specs que fijan llamadas exactas (emergenciasApi,
  ordersApiPublico, disponibilidadApi) lo detectaron, corregido para requests públicas byte
  idénticas.
- Verificación: unit 138/138, type-check OK, lint OK, E2E público 31/31, `e2e/auth-oidc.spec.ts`
  gated por `E2E_OIDC_ENABLED` (3 skipped sin STS verificado). Pendiente en vivo: login real
  contra el STS cuando su base Neon tenga host real y el usuario se cree desde el panel admin
  (fuera de alcance de T1 por decisión L5).
- Riesgo: auth (item 2) y dependencia nueva (item 5) → revisión nativa + verificador
  independiente antes de dar T1 por cerrado.

L7 — Revisión nativa de T1 en curso (2026-11-14, pausada por fin de jornada):
- Linaje `review-d5bdcc1ab0566417`, tier high, lentes risk/resilience/reliability, 27 archivos
  (1050 líneas), presupuesto de corrección 200, base `d86c5ab` (committed-only).
- Grupo de lentes EJECUTADO Y ADMITIDO (3 corridas, todas con salida real; la config de reviewer
  que fallaba en noviembre quedó resuelta).
- Pendiente: corrida del `provider_refuter` (forecast de 1 corrida de modelo ya entregado y
  autorizado por el humano el 2026-11-14). Mañana: reenviar el mismo binding del refuter con
  `reviewerRunAcknowledged: true`, seguir las transiciones del proveedor hasta
  `acknowledge-approved`, y luego el verificador independiente (`gentle-ai-verify`) que el plan
  del assess exige por el item 2.

L8 — Refuter de T1, corrección aplicada y bloqueo de autoridad (2026-11-15):
- El `provider_refuter` se ejecutó (forecast de 1 corrida ya autorizado) y devolvió
  `correction_required` con un hallazgo severo introducido por el candidato:
  `R4-001` (lente resilience, `src/stores/authStore.ts:75-80`): si la renovación silenciosa falla,
  `getAccessToken` devolvía `null` sin limpiar `user`/`isAuthenticated`; el guard seguía abriendo
  rutas protegidas y las requests salían sin `Authorization`, sin recuperación.
- Corrección aplicada en el commit `5df240b` (51 líneas de diff, presupuesto 200):
  `isTokenFresh()` + `isAuthenticated` dependiente de la frescura del token, limpieza de la sesión
  al fallar `signinSilent` y en `addSilentRenewError`, y guard de rutas que exige un token real
  (`getAccessToken`) en lugar de confiar en `isAuthenticated`.
- Tests: dos casos nuevos en `src/__tests__/authStore.spec.ts` (RED observado, luego GREEN).
  Verificación: unit 140/140, `type-check` OK, `lint` OK.
- BLOQUEO de autoridad: el plan de corrección no se puede declarar. `gentle_review status` ofrece
  el binding exacto (`request-hash 9be9fc3…`, `repository-context rctx2_da6c…`) y el CLI nativo
  (`gentle-ai review status … --next-transition`) devuelve esos mismos argumentos, pero
  `gentle_review_capture` lo rechaza siempre con `collectBinding is missing or stale for current STATUS`,
  con árbol limpio y en la misma tanda. El registro de rutas de captura por proceso se envenena:
  un `status` mío con `baseRef` = árbol (`db00fc4a…`, no resoluble como ref) quedó fijado como ruta
  (`retainNativeCaptureRoutes` no reemplaza una ruta que ya tiene selector).
- Continuación recomendada: sesión de Pi nueva (registro de rutas vacío) para declarar el plan de
  corrección y seguir hasta `acknowledge-approved`; luego el verificador independiente por el item 2.
- Límite de slice (aviso del harness): la rama acumula 527 líneas autoradas en 11 commits sobre
  `origin/main`; la unidad nueva es la corrección `5df240b` y la entrega debe planificarse antes del
  próximo commit.

L9 — Cierre del ciclo de revisión nativa de T1 (2026-11-15, sesión nueva de Pi):
- La recomendación de L8 funcionó: en sesión nueva el STATUS reofreció el binding del plan de
  corrección y `gentle_review_capture` lo aceptó con `correction_lines: 51` (19+8+24 de `5df240b`,
  dentro del presupuesto 200). El proveedor pasó a `targeted_validation_required`.
- Defecto de transporte (hallazgo de esta jornada): el preprocesamiento de parámetros de
  `gentle_review_capture` decodifica escapes `\n`/`\u000a` del argumento, lo que corrompe
  bindings/artefactos que contienen saltos de línea y produce rechazos de admisión
  («does not match its request and digests»). El primer intento del validador vía
  `gentle_review_run` (resume sin `baseRef`; con `baseRef` re-deriva un target nuevo y ofrece
  START con consent) falló por eso; el slot no se consumió y el STATUS reofreció el mismo slot.
- La segunda captura del slot reofrecido (mismo binding, forecast de 1 corrida de modelo
  reconocido) corrió el validador dirigido con evidencia nueva y fue ADMITIDA: estado
  `approved` con 9 hallazgos de asesoramiento no bloqueantes. `acknowledge-approved` quemó la
  autoridad (`gentle-ai.review-acknowledged/v1`); la entrega sigue siendo decisión del usuario
  bajo política ordinaria del repositorio.
- Hallazgos informativos (follow-ups, no reabren la revisión): R1 client_id con fallback
  silencioso en `src/config/oidc.ts:26`; R1 redirect post-login sin validar en
  `src/pages/auth/callback.vue:19`; R3 expiración indefinida dispara renovación por request
  (`authStore.ts:71-73`); R3 `signinRedirect` sin catch en el guard (`router/index.ts:174-183`);
  R3 header Authorization en requests públicas con sesión (`disponibilidadApi.ts:29-32`);
  R3 rechazo no manejado en `silent-callback.vue:11-13`; R4-002 espera de renovación en requests
  públicas; R4-003 logout-callback sin limpiar usuario local; R3 `isAuthenticated` sólo
  presencia de token (`authStore.ts:20`). Ninguno es candidate-caused severo.
- Verificación del assess (item 2 seguridad): el verificador independiente `gentle-ai-verify`
  quedó NO DISPONIBLE por admisión de runtime (exige `Risk: item N` en el lanzamiento y prohíbe
  añadirla sólo para admitirlo). Fallback prescrito ejecutado inline: unit 140/140 (incluye los
  2 tests de R4-001), type-check OK, oxlint exit 0, eslint sin hallazgos; corrección confirmada
  en HEAD (`authStore.ts` isTokenFresh + limpieza en `addSilentRenewError` y en el catch de
  `signinSilent`; guard exige `getAccessToken` real, `router/index.ts:176-189`).
- STS verificado vivo: discovery `https://127.0.0.1:44310/.well-known/openid-configuration`
  responde HTTP 200. Pendiente en vivo: E2E real `e2e/auth-oidc.spec.ts` gated por
  `E2E_OIDC_ENABLED` cuando el usuario provea credenciales de prueba.

L10 — Baseline de main, STS operativo y usuario de pruebas (2026-11-15):
- El trabajo fusionado está en `main` (`e13ac71`, `95d73ec`); la rama de T1
  `feature/product-layout-and-details` queda como historia y NO es el baseline. La implementación
  OIDC vigente en main difiere de la descrita en L6: hoy es `src/auth/oidcClient.ts`
  (`createOidcSettings`/`createUserManager`), `src/auth/authService.ts` y `src/stores/authStore.ts`
  (`createAuthStore`, `ADMIN_ROLES`, `BUYER_ROLE="comprador"`), con suite E2E real
  (`e2e/auth.setup.ts` + `e2e/helpers/oidc.ts`, proyectos `auth-setup` → `real-admin`/`real-comprador`/`real-registration`).
  Los specs de T1 (`authStore.spec.ts`, etc.) no están en main. Feature nueva en rama
  `feature/chatbot-atencion-cliente` (desde `main` `1a1fa78`), donde vive este documento restaurado.
- **T2 verificado en vivo (cierre operativo, sin commit de código)**: STS `https://localhost:44310`
  vivo con PostgreSQL Neon (`ania_identity`), panel `:7127` y Admin API `:44302` activos vía Aspire;
  registro público `/Account/Register` habilitado y **asigna el rol `comprador` automáticamente**
  (la nota de L3 sobre registro sin rol quedó desactualizada con el STS actual); backend espera roles
  `['admin','AdminAniaIdentity','comprador']` (`AniaHechoAMano_Backend/src/auth/auth.config.ts`).
- Usuario de pruebas creado y verificado de punta a punta: `comprador-test` (creado por registro
  público del STS, password generada aleatoria). Verificado con Playwright: login STS OK, round trip
  OIDC completo del SPA OK (callback con code+state), sesión en `localStorage`
  (`oidc.user:https://localhost:44310:client_acc8fe…`), claim `role: "comprador"`, token ~1 h, y el
  guard niega ruta admin (`/sin-permisos`) con ese rol. Credenciales registradas en
  `playwright/.auth/users.json` (gitignored) según lo pedido por el usuario.
- Entorno del dev server: el SPA exige 6 variables `VITE_*` (`oidcClient.ts:3-11`) y el `.env` que
  cargaba el servidor en marcha no las tenía; se reinició `bun run dev --port 5173` con las variables
  inline (authority `https://localhost:44310`, client `client_acc8fe2608a830b8125e7705cdf71fc5`, scope
  `openid profile roles ania.api.admin`, redirect/post-logout `:5173/auth/callback` y
  `/auth/logout-callback`, API `http://localhost:3001/api` — todos valores públicos ya registrados en
  `identityserverdata.Development.json`). Pendiente de decisión del usuario: persistirlas en `.env`.
- Salud del baseline tras el merge: unit 332/332 (3 skipped gated), `type-check` OK, lint OK. Se
  reparó `node_modules` con `bun install --frozen-lockfile` (faltaba `web-tree-sitter`, declarado en
  `package.json`; el suite `tools/backend-contract` no cargaba sin él).
- Bloqueo pendiente para la cadena E2E real (`auth.setup` → `real-admin`/`real-comprador`):
  `loadE2ECredentials` exige `roles.admin` obligatorio (`e2e/helpers/oidc.ts:296`) y la contraseña del
  `admin` la configuró el usuario. Mientras no se provea, las suites reales quedan gated y la
  verificación de login se hizo con la sonda Playwright descrita arriba.
- Siguiente tarea del plan: T3 (motor de rangos, backend, worker).

L11 — Adaptación de `role-access-real` y reparación de la confianza TLS STS↔backend (2026-11-15,
noche, decisión del usuario: «sí, adaptala»):
- El usuario registró en `playwright/.auth/users.json` la credencial admin (`AniaHechoAMano`) y se
  generó `playwright/.auth/credentials.json` (gitignored) con roles admin+comprador; `auth-setup`
  corre verde (login real de ambos roles contra el STS).
- Adaptación de la spec (`e2e/role-access-real.spec.ts`, test «authenticated role follows its
  public and protected access policy»): la suposición original (que `/admin/solicitudes` montaba y
  disparaba `GET /api/pedidos` para recibir el 403 del backend) quedó desactualizada: el guard del
  SPA niega ANTES y redirige a `/sin-permisos` sin montar la página, y `waitForResponse` expiraba.
  La variante comprador ahora aserta: (a) redirect del guard a `/sin-permisos`, (b) que la navegación
  NO dispara la request protegida, y (c) conserva la denegación server-side con una llamada directa
  al API con el token comprador esperando 403. La variante admin mantiene su flujo original.
- Hallazgo real detrás del rojo: el backend rechazaba TODOS los JWT con 401 — el certificado
  autofirmado del STS hacía fallar el fetch del JWKS en Node (`DEPTH_ZERO_SELF_SIGNED_CERT`),
  aunque `src/auth/local-jwks-fetch.ts` ya está preparado para usar los CAs del sistema + extras.
  Fix de entorno: extraer el cert dev del STS a `playwright/.auth/sts-dev-cert.crt` (público,
  gitignored) y reiniciar el backend con `NODE_EXTRA_CA_CERTS` apuntándolo. Verificado con curl:
  admin → 200, comprador → 403. Pendiente de decisión del usuario: persistir la variable en su
  forma de lanzar el backend (o confiar el cert a nivel de sistema).
- E2E tras el fix: `--project=real-comprador` 3/3, `--project=real-admin` (test de role access) 2/2.
  Lint y type-check OK. Sin cambios de código de aplicación.

L12 — Revisión nativa de la adaptación (`198ba64`) cerrada aprobada (2026-11-16):
- Linaje `review-59f96f69dd1b98d8`, tier medium, lente reliability, 3 archivos / 371 líneas,
  presupuesto 186 (sin uso). Forecast de 1 corrida (pi_host_relay) autorizado por el humano; el
  reviewer corrió (~154 s) y el estado pasó a `approved`. `acknowledge-approved` quemó la autoridad
  (`gentle-ai.review-acknowledged/v1`); la entrega sigue bajo política ordinaria del repositorio.
- 2 hallazgos informativos NO bloqueantes (follow-ups, no reabren la revisión):
  - `R3-narrow-request-absence-window` (WARNING): la aserción negativa de «no hay request protegida»
    tiene una ventana de carrera — una request en vuelo que aterrice después de la aserción de URL
    sería invisible; sugerido re-chequear el array tras la aserción de sesión.
  - `R3-oidc-token-parse-swallow` (SUGGESTION): el lector de token colapsa tres modos de fallo en
    `null` y traga el error de parseo; el test sigue sin poder pasar en silencio, pero el diagnóstico
    se debilita; sugerido relanzar el error de parseo por separado.

L13 — Confianza TLS resuelta por Aspire; quedan base de datos y `.env` del frontend (2026-11-16,
madrugada, coordinación con la sesión de Aspire):
- Mecanismo definitivo sin código casero: el AppHost de Aspire YA inyecta `NODE_EXTRA_CA_CERTS` al
  proceso `api` con su propio PEM del dev-cert de ASP.NET Core (el cert del STS ES ese dev-cert,
mismo fingerprint) y quedó explícito `.WithCertificateTrustScope(CertificateTrustScope.Append)`
  en `AppHost.cs` (default documentado, ahora escrito). Verificado: handshake a Neon sigue
  authorized=true (no pisa CAs públicas). Mis scripts con la variable en `package.json` quedaron
  revertidos a `nest start` planos por Aspire — decisión correcta; standalone fuera de Aspire
  requiere exportar la variable a mano.
- Puertos: sin cambios necesarios (front 5173 y api 3001 con `isProxied:false`; identity
  44310/44302/7127 desde el launch profile). Stack dejado levantado y verificado: los 5 puertos
  responden; API sin token → 401.
- JWT ya se valida: token fresco del STS pasa autenticación y llega al handler. La confianza del
  dev-cert quedó RESUELTA. Falta observar 200/403: ambos roles reciben
  `500 DATABASE_ERROR "Unable to synchronize the authenticated identity"` porque la base apuntada
  por `DATABASE_URL` del backend tiene historial de migraciones divergente
  (`20261012000000_margen_ganancia_producto` existe en la base pero no en el repo local). Migrar o
  repuntar muta un datastore → decisión del humano (posible base compartida con otro checkout).
- Bloqueo frontend: el `.env` local (gitignored) perdió las 6 variables `VITE_*` (queda sólo
  `VITE_VUE_APP_DOMAIN`); `readFrontendEnvironment` tira antes de redirigir y `auth-setup` no ve el
  formulario del STS. Restaurarlas (valores públicos, los mismos de L10) y reiniciar el recurso
  `front` de Aspire (Vite lee env al arrancar).

L14 — Base compartida reconciliada y `VITE_*` inyectadas desde el AppHost (2026-11-16):
- Decisiones del humano: «Adaptar la migración actual, a lo que hay en neon, o sea marcarla como
  aplicada» y, para el entorno del front, «Inyectarlas desde AppHost.cs».
- La divergencia no era la que se creía: `prisma migrate status` listaba 5 migraciones pendientes que
  estaban VACÍAS en disco y sin trackear (restos de un `migrate dev` fallido) → eliminadas. Las
  migraciones reales del repo son 2 (`20260827_init_external_identities`,
  `20260918141803_bulk_import_keys`). `prisma migrate diff` (comparación autoritativa) mostró sólo dos
  diferencias entre `schema.prisma` y `neondb`: `productos.margen_ganancia_porcentaje` existía en la
  base y no en el repo (la migración fantasma `20261012000000_margen_ganancia_producto`), y los 4
  defaults `@default(dbgenerated(...))` de `codigo_importacion` estaban en el repo y no en la base.
- Reconstruida `prisma/migrations/20261012000000_margen_ganancia_producto` con el DDL equivalente y
  agregada la columna a `schema.prisma`; la base ya la tenía registrada (P3008), así que no hubo
  `resolve --applied`. Sin `db push` y sin dropear la columna: nada destructivo.
- Nueva migración aditiva `20261116000000_codigo_importacion_defaults` (cuatro
  `SET DEFAULT gen_random_uuid()::text`, reversibles con `DROP DEFAULT`), aplicada con
  `migrate deploy`. `migrate diff` seguía listándolos porque Postgres normaliza la expresión a
  `(gen_random_uuid())::text`; alineado `schema.prisma` a esa forma → diff vacío y
  `migrate status` «Database schema is up to date». `prisma generate` regenerado.
- El 500 no era de lectura: `/api/config/contacto`, `/api/categories` y `/api/productos` respondían
  200 contra la misma base, así que el fallo vivía en el camino de escritura.
- El entorno del front ya no depende de un archivo local: las 6 `VITE_*` se inyectan en el recurso
  `front` desde `AppHost.cs` (constantes + `.WithEnvironment`), con valores públicos verificados
  contra `identityserverdata.json` (client `client_acc8fe2608a830b8125e7705cdf71fc5`, scopes
  `openid profile roles ania.api.admin`, redirects `:5173/auth/callback` y `/auth/logout-callback`,
  API `http://localhost:3001/api`). Vite aplica `process.env` por encima de los archivos `.env`.
- Stack reiniciado con `dotnet run` (el AppHost no recarga solo): front 5173 → 200, api 3001 → 401 sin
  token, STS 44310 → 200, Admin API 44302 y panel 7127 arriba; los 6 nombres `VITE_*` verificados en
  el entorno del proceso `vite`.
- E2E real sobre la rama: `auth-setup` 1/1 (1.1m) y `real-comprador` 3/3 verdes. `real-admin` 17/21
  con 3 fallos que no provienen de este cambio y quedan como trabajo abierto:
  1. `agenda-emergencia-real` — la primera navegación admin de la corrida cae en `/sin-permisos`
     (Error 403) aunque el resto de rutas admin del mismo run funcionan: falta diagnosticar la
     sesión/inicialización en ese primer acceso.
  2. `pedidos-integracion-real:107` — sin enlace «Contactar por Facebook» porque
     `/api/config/contacto` devuelve `facebook_page_url` vacío: el backend lo lee de
     `FACEBOOK_PAGE_URL`/`FACEBOOK_PAGE_ID` del entorno, que no están definidas.
  3. `pedidos-integracion-real:39` — el wizard no mostró «¿Para cuándo la quieres?»; pasó en la
     primera corrida y falló en la segunda, dependiente de los datos que las propias suites escriben
     en la base compartida.
- Desajuste de baseline detectado: `main` conserva la spec vieja de `role-access-real`; la adaptación
  de L11 (`198ba64`) vive sólo en `feature/chatbot-atencion-cliente`, así que el fallo de comprador
  visto al principio era `main` sin esa corrección, no una regresión.
