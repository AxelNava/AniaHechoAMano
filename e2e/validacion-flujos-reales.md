# Validación real de comprador y administración

Este documento describe los criterios y la reproducción de los flujos reales. No es evidencia de una
corrida en vivo: en este cambio no se ejecutaron los tests E2E contra frontend, backend ni IdentityServer.

## Criterios del recorrido

| Comprobación | Criterio esperado |
| --- | --- |
| Administrador de la SPA | Login y GET protegido `/api/pedidos` exitosos |
| Comprador | Rol comprador sin rol admin; catálogo público sin bearer |
| Restricción UI del comprador | `/admin/solicitudes` redirige a `/sin-permisos` |
| Restricción API del comprador | GET `/api/pedidos` devuelve 403 y conserva la sesión |
| Solicitud con modificación | Creación autenticada, imagen real subida y estado `COTIZANDO` |
| Cotización administrativa | Precio, minutos y fecha comprobados mediante una lectura posterior |
| Solicitud tal cual | Estado `PENDIENTE_CONFIRMACION` y duración congelada |
| Confirmación administrativa | Un POST de confirmación, estado `CONFIRMADO` y acciones finales ocultas |
| Regresión de propiedad | Una descripción de otro pedido es rechazada por el guard del test |

La confirmación de un recibo existente debe verificar el ID, la referencia y la descripción congelada del
producto E2E, además de las demás condiciones del flujo. El nombre del cliente no prueba pertenencia,
porque una cuenta autenticada puede conservar su cliente vinculado.

## Corrección y datos de prueba

- `src/views/ProductoDetalleView.vue` debe aceptar `alt: null` del backend y conservar el texto alternativo de respaldo.
- La disponibilidad debe validarse con un fixture aislado y con autorización explícita cuando los productos públicos no tengan minutos configurados.
- Los datos creados por estos flujos deben usar el prefijo `[E2E]`. No hay limpieza automática ni borrado de registros compartidos.

## Reproducción segura del flujo estatal

Inicia los servicios manualmente. Para el certificado local del STS, configura en la misma terminal PowerShell
que inicia Nest:

```powershell
$env:NODE_USE_SYSTEM_CA = "1"
# Inicia Nest con su comando habitual desde esta terminal.
```

Esto incorpora certificados de confianza de Windows; no desactiva TLS. Un reinicio desde otra terminal puede
perder la variable.

En la terminal de pruebas, configura el archivo de credenciales local y un identificador único:

```powershell
$env:E2E_CREDENTIALS_FILE = "e2e/credentials.json"
$env:E2E_RUN_ID = "flow-20260905-1842"
$env:E2E_PRODUCTO_FIJO_ID = "40"
$env:PLAYWRIGHT_NO_COPY_PROMPT = "1"
node node_modules/@playwright/test/cli.js test --config=playwright.pedidos-flujo.config.ts --headed --grep admin_confirma_existente
```

La reanudación debe verificar el pedido propio guardado y no enviar un segundo POST si ya está confirmado.
No ejecutes la suite completa con este identificador: las fases creadoras rechazan archivos de estado existentes.
Un recorrido nuevo requiere un identificador nuevo y un fixture cuyo marcador coincida; puede crear más datos reales.

Bun sigue siendo el gestor de paquetes. Si el lanzamiento de Chromium bajo Bun falla en el entorno local, usa
Node solo como diagnóstico y no compartas credenciales ni artefactos de fallos.

## Chequeos de esta simplificación

- La configuración primaria debe listar únicamente los proyectos OIDC reales: setup, admin, comprador opcional y registro.
- `bun run test:e2e` debe ejecutarse sin variables de modo; necesita los servicios levantados manualmente y el archivo local ignorado `playwright/.auth/credentials.json`.
- `pedidos-flujo-real` y el panel administrativo de IdentityServer se mantienen fuera de la suite primaria y conservan sus configuraciones dedicadas.
