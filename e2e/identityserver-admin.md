# E2E aislada del panel de IdentityServer

Este spec comprueba el acceso al panel administrativo mediante el STS hospedado y, cuando la UI expone controles inequívocos, corrobora configuración de solo lectura. No inicia ni detiene servicios.

**Estado:** la validación en vivo contra una instancia con credenciales reales está pendiente; este flujo no se ha presentado como una inspección UI completada hasta ejecutarse en ese entorno.

## Ruta rápida

1. Copia `e2e/identityserver-admin.example.json` a una ubicación **fuera del repositorio**.
2. Sustituye únicamente los placeholders `username` y `password` por credenciales locales de administración.
3. Revisa `panelUrl` (el ejemplo usa `https://localhost:7127`) y conserva los identificadores esperados.
4. Define la ruta externa y ejecuta el spec aislado:

   ```powershell
$env:E2E_IDENTITYSERVER_ADMIN_CREDENTIALS_FILE = "C:\ruta-segura\identityserver-admin.credentials.json"
$env:PLAYWRIGHT_NO_COPY_PROMPT = "1"
node .\node_modules\@playwright\test\cli.js test --config=playwright.identityserver-admin.config.ts
```

El lanzamiento usa deliberadamente el CLI de Playwright bajo Node por el fallo de handshake observado con Bun; `bun` sigue siendo el gestor de paquetes del repositorio. `PLAYWRIGHT_NO_COPY_PROMPT=1` usa la variable reconocida por la versión instalada de Playwright para omitir su contexto de error automático.

La autoridad esperada del STS es `https://localhost:44310`. El panel y el STS deben estar ejecutándose antes de la prueba.

## Formato de credenciales

El archivo externo usa este esquema versionado:

| Campo                        | Uso                                                                 |
| ---------------------------- | ------------------------------------------------------------------- |
| `panelUrl`                   | URL HTTP(S) del panel, sin usuario, contraseña, query ni fragmento. |
| `username`, `password`       | Credenciales locales; no se imprimen ni se guardan en Playwright.   |
| `expected.publicClientId`    | Cliente público que debe existir.                                   |
| `expected.apiResourceName`   | Recurso API que se lee.                                             |
| `expected.apiScopeName`      | Scope API esperado y permitido al cliente.                          |
| `expected.apiResourceClaims` | Claims seleccionados en el recurso (en este entorno: `role`).       |
| `expected.apiScopeClaims`    | Claims seleccionados en el scope (en este entorno: ninguno).        |

Si falta `E2E_IDENTITYSERVER_ADMIN_CREDENTIALS_FILE`, el JSON es inválido o conserva placeholders, la prueba termina con un error genérico sin revelar la ruta ni valores sensibles.

## Límites de seguridad y alcance

- La configuración aislada es headed, no tiene `webServer`, reintentos, traces, screenshots, video ni `storageState`; tampoco depende de la SPA.
- El login usa los campos reales del STS (`#Username`, `#Password` y el botón de login) derivados de la vista hospedada; la comprobación de sesión usa `X-ANTI-CSRF: 1` y credenciales `same-origin`, conforme al protocolo nativo del panel.
- Las páginas de clientes, recursos y scopes se alcanzan siguiendo enlaces visibles del panel. Solo se hacen navegaciones GET; nunca se rellenan controles de configuración ni se pulsa Guardar, eliminar o crear.
- Si la versión desplegada no ofrece un enlace, fila o control inequívoco, la corroboración profunda queda marcada como **no verificada** y el spec no la presenta como aprobado. El login se mantiene como comprobación independiente.
- Este flujo no demuestra por sí solo permisos del API, asignación de roles ni la causa de respuestas `401`/`403`; esas comprobaciones pertenecen a pruebas separadas.

No guardes el archivo externo, sus copias ni credenciales reales en el repositorio o en reportes compartidos.
