# web-app

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
bun install
```

### Compile and Hot-Reload for Development

```sh
bun dev
```

### Type-Check, Compile and Minify for Production

```sh
bun run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
bun lint
```

## Real E2E authentication

The Playwright suite is real-only: `bun run test:e2e` always exercises the frontend, backend,
and hosted IdentityServer path. No E2E test replaces backend responses with mocks.

### Manual stack and base URL

Before running any E2E test, start the frontend, backend, and IdentityServer manually. Playwright does not
start any project or run standalone readiness/stack checks; it only connects to `E2E_BASE_URL`, normalized
as an HTTP(S) origin. The default is `http://localhost:5173`.

### Local role credentials

1. Copy `e2e/credentials.example.json` to the ignored local path:

   ```sh
   cp e2e/credentials.example.json playwright/.auth/credentials.json
   ```

2. Replace the `admin` placeholders with the local Duende username and password. Admin is mandatory;
   its placeholders always fail before the browser login attempt. For an admin-only run, leave **both**
   documented `comprador` placeholders unchanged. A buyer entry with one real value and one placeholder
   is rejected as a partial configuration.
3. Start the frontend, backend, and IdentityServer manually, then run the primary real-only suite:

   ```sh
   bun run test:e2e
   ```

   The default credential path is `playwright/.auth/credentials.json`. This local credentials file is
   unavoidable because the browser setup must log in through Duende; it is ignored and must never be
   committed. The legacy `e2e/credentials.json` path is ignored as well. To use another local file for
   a diagnostic run:

   ```sh
   E2E_CREDENTIALS_FILE=/absolute/local/credentials.json \
   bunx playwright test e2e/role-access-real.spec.ts --project=real-admin
   ```

Credential setup logs in only configured roles through the browser, validates the callback and local
session shape, and writes the ignored `playwright/.auth/real-oidc.roles.json` with at least the admin
session. In an admin-only setup, the `real-admin` matrix uses that same session for anonymous
checks, authenticated public catalog navigation, the `/pedido` customer wizard, and protected admin
navigation. Playwright injects the selected role's OIDC User into session storage before navigation.
Tokens must still have a future `expires_at`; rerun the command to regenerate configured role sessions
when they expire or when credentials/claims change. The harness does not silently refresh an expired
generated file.

To restore the buyer authorization branch later, replace **both** optional `comprador` placeholders
with a real non-MFA buyer account. Playwright then adds the `real-comprador` project and setup writes its
session for the role-specific browser journeys.

### Real buyer registration

The registration journey is included in the primary suite. It starts from the frontend `/register` route
without using an existing browser session, follows the hosted IdentityServer registration form, verifies the
app callback, and confirms that the newly created account is not presented as an admin. All generated buyer
registrations are retained in the ignored TXT archive `playwright/.auth/registration-credentials.txt`, which is
updated atomically with restrictive permissions and can be reused manually. Use
`E2E_REGISTRATION_CREDENTIALS_FILE` to select another local file path when needed; the value must be a local
path, not a URL.

To run only this real project, without environment variables:

```sh
bunx playwright test e2e/user-registration-real.spec.ts --project=real-registration
```

The `real-registration` project uses empty storage and has no `auth-setup` dependency, so this focused run
does not need the role credential JSON. It never prints the generated username or password. The TXT file uses
a stable human-readable `Username`/`Password` format.

Legacy admin-only sessions remain supported as a diagnostic override. Set `E2E_SESSION_FILE` to the previous
session JSON leaf and bypass the browser credential setup explicitly:

```sh
E2E_SESSION_FILE=playwright/.auth/real-oidc.json \
  bunx playwright test e2e/role-access-real.spec.ts --project=real-admin --no-deps
```

The normal command does not use this override: it always runs `auth-setup`, which logs in through the browser
and writes the generated role session envelope.

The legacy entry name must be `oidc.user:<authority>:<client-id>`, its origin must match the normalized
`E2E_BASE_URL` (default `http://localhost:5173`), and its serialized OIDC User must contain a nonempty
`access_token`, a nonempty `profile.sub`, and an unexpired numeric `expires_at` Unix timestamp.

### Duende client prerequisite

The Duende client registration must exactly match the frontend values used by the run. For the default
local `E2E_BASE_URL`, use:

- client id: `client_acc8fe2608a830b8125e7705cdf71fc5`
- redirect URI: `http://localhost:5173/auth/callback`
- post-logout redirect URI: `http://localhost:5173/auth/logout-callback`
- allowed CORS origin: `http://localhost:5173`
- allowed scopes: `openid profile roles ania.api.admin`

If `E2E_BASE_URL` changes, register its normalized origin in the redirect, post-logout, and CORS values.
The browser flow reaches the Duende login page; credential setup validates the callback and local
session shape only, and does not call backend API endpoints. Admin must be a non-MFA E2E account with
the intended backend role/claims; the optional buyer account must also be non-MFA when enabled.

Credentials, generated role sessions, legacy session files, access tokens, and refresh tokens are
local secrets: keep them under ignored storage and never commit them.

## Backend contract inspector

The repository includes a Bun CLI that parses the sibling NestJS backend with Tree-sitter and generates an isolated contract for the frontend. It links controllers to service return types, request DTOs, Swagger response metadata, route parameters, auth visibility, and generated typed API calls.

```sh
# Analyze the backend and generate src/generated/backend-contract/
bun run backend:inspect

# Fail if the generated contract is stale
bun run backend:inspect:check

# Probe a safe public GET and print its query/response
bun run backend:inspect -- --probe GET /api/config/contacto
bun run backend:inspect -- --probe GET /api/productos \
  --query '{"page":1,"limit":20}'
bun run backend:inspect -- --probe GET /api/productos/:id \
  --path-params '{"id":1}'
```

The generated files are `manifest.json`, `types.ts`, `api.ts`, and `index.ts`. They are intentionally separate from hand-written `src/types/` and `src/services/` files. The manifest is static evidence; a runtime probe is needed for data-dependent branches.

GET is the only probe method allowed by default. A mutating request requires both `--allow-mutations` and `--confirm-mutation`. Protected endpoints read a token only from `BACKEND_ACCESS_TOKEN` (or the variable passed with `--token-env`) and never print it. Use `--save-response <path>` to persist a probe result locally. The route parser accepts both `/api/...` and `api/...`; in Git Bash, use the latter or set `MSYS_NO_PATHCONV=1` to avoid automatic path conversion.
