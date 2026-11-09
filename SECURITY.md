# Security audit and deployment configuration

## HTTP response policy

Production CSP permits same-origin scripts and stylesheets, Google Fonts, the Google Maps embed, and the site's Cloudinary video path. It blocks inline scripts and styles, framing of the site, and plugins. Vite development permits its live styles and hashed React preamble. Vite preview uses the production CSP.

Static files grant no CORS access. On the Node and Vite APIs, cross-origin POST requests are available only on `/api/contact`, `/api/enquiry`, and `/api/quote`. An approved preflight allows the `Content-Type` request header and may be cached by the browser for ten minutes. The API varies responses by origin, and preflight responses also vary by requested method and headers. The public forms do not use application cookies or authentication, so the API sends no CORS credential grant. [CORS behavior](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

Node sends host-only HSTS for one year on HTTPS responses, including requests whose TLS is terminated by a configured trusted proxy. Static hosts deliver the same HSTS policy on HTTPS. If an edge platform also supplies HSTS, verify the final response carries a single policy. [Cloudflare static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)

## Prior audit findings and fixes

| Finding | Effect | Fix |
| --- | --- | --- |
| Node resolved request paths against the build directory without enforcing containment. | A crafted request could read files outside the build, potentially including local configuration and keys. | Reject traversal, private filenames and source-map requests. Check that the real file path stays inside `dist`. |
| Vite accepted arbitrary hosts and origins, bound to every interface, and used the default `VITE_\*` exposure convention. | A reachable development server could expose source files. A variable accidentally given the build prefix could become available to client code. | Bind dev and preview to loopback by default. Restore Vite host and origin restrictions, block private paths, and explicitly publish only `VITE_SITE_URL`. Disable source maps and reject sensitive filenames and symlinks in `public`. |
| Node trusted caller-supplied forwarding headers and accepted API POSTs over plain HTTP before redirecting. | A caller could evade IP limits, spoof HTTPS, or send contact information without TLS. Redirect HTML also reflected request data. | Trust forwarding headers only from configured proxy IPs, require HTTPS for non-local API traffic, fix the redirect host, and remove the reflected response body. |
| API body limits relied on `Content-Length`, and the API reflected request paths and attachment names. | Chunked requests could exhaust memory. Error messages could repeat sensitive text supplied by a caller. | Count received bytes, reject cross-origin submissions from unapproved sites, sanitize errors and send API responses with `Cache-Control: no-store`. Production React rendering and hydration log fixed messages, and the error page hides technical details. [React root error handling](https://react.dev/reference/react-dom/client/hydrateRoot#error-logging-in-production) |
| The release workflow installed Wrangler in the step that received the deployment token. | The installation process could inherit the token. | Install the version-pinned CLI before injecting deployment credentials, then call the installed executable in the deploy step. |
| The standalone Worker had no explicit API handler. | API requests could fall through to static asset handling. | Route API requests to an explicit unavailable response with no caching. The separate Pages release already uses an unavailable response for API POSTs. |
| The dependency audit flagged `vite`, `source-map-js`, `undici`, `zod` and `fast-uri`. | The affected dependency tree included four high-severity packages and one moderate-severity package. | Apply compatible lockfile updates in both checkouts. npm reported zero remaining advisories after the update. |

The local repository and the separate Pages release checkout were scanned along with their generated assets and reachable Git history. The scan found no confirmed hardcoded credential or candidate requiring rotation. A credential copied to a hosting account, elsewhere in GitHub, or into production logs is outside the local scan. Provider-specific checks cannot detect every custom credential or every encoded or archived copy.

## Files changed

- In both checkouts, `.env.example`, `.gitignore`, `package.json`, `package-lock.json`, `vite.config.ts`, `server.js`, `server/config.js`, `server/api.js`, `server/validation.js`, `src/main.tsx`, `src/hooks/useSEO.ts`, `src/components/ui/ErrorBoundary.tsx` and `tests/protection.test.js`.
- In the main checkout, `README.md`, `SECURITY.md`, `wrangler.jsonc` and `server/static-worker.js`.
- In the Pages release checkout, `.github/workflows/cloudflare-pages.yml`.

## Environment inventory

| Variable | Visibility | Location and default |
| --- | --- | --- |
| `VITE_SITE_URL` | Public build setting | Optional for Vite. Set in a local `.env.local` or in the frontend build environment. Accepts an HTTP(S) origin and defaults to the canonical site URL. |
| `NODE_ENV` | Server configuration | Set to `production` for a production Node runtime. Only `development` selects the development allowlist. |
| `CANONICAL_HOST` | Server configuration | Optional lowercase hostname in the Node runtime. Defaults to the canonical site host. |
| `ALLOWED_ORIGINS` | Server configuration | Comma-separated, exact HTTPS frontend origins for Node production and Vite preview. Blank grants no cross-origin access. |
| `DEV_ALLOWED_ORIGINS` | Server configuration | Comma-separated, exact HTTP(S) frontend origins for Vite dev and Node with `NODE_ENV=development`. Blank grants no cross-origin access. |
| `PORT`, `HTTP_PORT`, `HTTPS_PORT` | Server configuration | Optional Node listener ports. `PORT` takes precedence over `HTTP_PORT`. HTTP and HTTPS default to 80 and 443. |
| `TRUSTED_PROXY_IPS` | Server configuration | Comma-separated addresses of the proxies that connect directly to Node. Unset means Node ignores forwarding headers. Required when a reverse proxy terminates TLS for the Node server. |
| `SSL_KEY_PATH`, `SSL_CERT_PATH` | Private runtime configuration | Set both in the Node runtime for direct TLS, or omit both when the proxy terminates TLS. Store the key outside the repository and web root, readable by the service account only. |
| `CLOUDFLARE_ACCOUNT_ID` | Deployment identifier | Required by the Pages workflow as an Actions variable in the release repository. |
| `CLOUDFLARE_API_TOKEN` | Private deployment credential | Required by the Pages workflow as an Actions secret in the release repository. Limit it to Pages deployment permissions for the target account. |

The application has no configured authentication, JWT signing, database, SMTP, or private third-party API integration. Google Maps links, Google review data, fonts and Cloudinary media are public resources. No application credential is required to build or start the current code. Wrangler's `ASSETS` binding points to `dist`.

## Local setup

Copy `.env.example` to `.env.local` and set only the values your setup needs. Vite reads the public site URL and the allowlist for the selected server mode. `npm run serve` reads `.env.local` for Node. Same-origin form submissions work with an empty allowlist. Prefer local defaults for testing. Set a nonprivileged local port if needed. Keep environment files, private keys and customer submissions outside `public` and `dist`.

## Production setup

- **Cloudflare Pages.** The release checkout deploys `dist` through GitHub Actions. Set the account ID under the release repository's Actions variables and the deployment token under Actions secrets. Give production and preview separate runtime settings. If a future Pages Function needs a private credential, configure it as an encrypted secret in the Pages project's Variables and Secrets settings and read it from `context.env`. [Cloudflare Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- **Cloudflare Workers.** The standalone Worker serves `dist`. Store future private runtime values as Worker secrets and read them from the Worker environment. Keep private values out of Wrangler plain-text configuration and the Vite build. [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- **Node.** Inject runtime settings from the service environment or a secrets manager and run `node server.js` against the production build. If a reverse proxy terminates TLS, restrict direct access to Node, configure `TRUSTED_PROXY_IPS`, preserve the public `Host` for same-origin form requests, overwrite `X-Forwarded-Proto` with the observed scheme, and overwrite `X-Forwarded-For` or append the observed client address as its rightmost entry. Verify that the reverse proxy does not retain a caller-supplied protocol header.
- **Other static hosts.** Vercel, Netlify and the static Caddy, Nginx and Apache configurations serve public assets. A live form integration would require same-origin routing to an approved backend. Keep credentials in that backend's runtime environment.

## Credential rotation and incident response

1. Revoke a confirmed exposed credential immediately. If there is evidence of active misuse, inspect the provider's audit trail and affected deployments.
2. Create a replacement with the narrowest permissions, update its runtime or deployment secret, and verify a controlled build, deploy or integration request. Confirm the old credential is rejected. For TLS, replace the private key and reissue the certificate.
3. Identify where the old value appeared, including Git history, forks, artifacts, caches, build logs and deployment logs. Remove affected copies where possible. Coordinate any Git history rewrite with repository owners and collaborators after revocation. Deleting the latest copy leaves earlier commits intact. [GitHub guidance on removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

## Prior audit verification

- Production builds passed in both checkouts. The browser build check inspected 130 main and 129 release files. It found no injected private test values, standalone source maps, or inline source maps. It verified that the approved public site URL appeared in browser JavaScript and that the production bundles omitted technical error details.
- All 163 main tests and 159 release tests passed. Regression checks cover path traversal, private files, forwarding-header forgery, unapproved browser origins, and chunked requests exceeding the body limit.
- Production-mode Node smoke tests verified startup validation, runtime environment loading, page routes, contact validation, and trusted proxy isolation. Vite development checks verified private-file, host, and cross-origin restrictions. The Worker and Pages API handlers returned a non-cacheable HTTP 503 in local tests.
- The redacted history scan covered 23 main commits and three release commits reachable from local refs and reflogs. The dependency audit reported zero advisories in both patched lockfiles.

## HTTP policy verification

The production builds and 163 automated tests pass in each checkout. Chrome DevTools checks on the local HTTPS server found no CSP violations across 11 representative routes. Google Fonts, the Google Maps embed, and the Cloudinary video loaded under the enforced policy. Chrome accepted same-origin and allowlisted form requests and rejected unapproved origins, credentialed CORS, cross-origin asset fetches, framing, and an injected inline script. The Worker and Pages API fallbacks returned HTTP 503 with security headers and no CORS grants.

## Remaining release checks

- Verify live GitHub Actions and Cloudflare settings, token scope, production access, and logging in the hosting accounts. Local workflow changes require a release to take effect.
- Establish and test end-to-end form delivery before treating online submissions as operational. The Pages API returns HTTP 503. The Node handler validates submissions and returns receipts without persistence or delivery.
- Apply abuse controls at the edge if the public form endpoints are enabled. The Node limiter is per process and does not coordinate across replicas. Validate file contents before storing or forwarding uploads in a future delivery integration.
- The workflow pins Node 26.7.0. Node.js announced a high-severity security release for the 26.x line on or shortly after 11 November 2026. Update the CI pin and any Node runtime when the fixed version is available. [Node.js security release notice](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases)
