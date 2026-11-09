# Auckland Roof Professionals — React Site

Migrated from the vanilla static site (`../arp-site`) to **React + TypeScript + Tailwind + shadcn structure** (Vite).

## Stack
- **Vite 8** + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** — utilities only (preflight disabled on purpose; the site ships its own design system in `src/arp.css`)
- **shadcn structure** — `components.json`, aliases `@/components`, `@/components/ui`, `@/lib`, `@/hooks`, `cn()` in `src/lib/utils.ts`
- **react-router-dom** — SPA routing

## Structure
```
src/
├── main.tsx                entry (imports index.css + arp.css)
├── App.tsx                 Router, QuoteProvider, GlassFilter, scroll/reveal managers
├── index.css               Tailwind v4 theme + utilities (no preflight)
├── arp.css                 full site design system (light theme, blue/copper palette) + glass header CSS
├── components/
│   ├── ui/
│   │   └── liquid-glass.tsx   GlassEffect / GlassDock / GlassButton / GlassFilter
│   └── site/
│       ├── Header.tsx         glass navbar (desktop-only, engages when scrolled)
│       ├── Footer.tsx
│       ├── QuoteModal.tsx     context-driven quote dialog
│       ├── quote-context.tsx  openQuote(service?) access from any component
│       └── shared-bands.tsx   CtaBand + MapBand
├── pages/
│   ├── HomePage.tsx           hero, stats count-up, services gateway, pinned process
│   │                          timeline (inertial ease), why, projects, story, trust band,
│   │                          testimonials, FAQ accordion, map, contact
│   ├── CategoryPage.tsx       /commercial + /residential (service card grids)
│   └── ServicePage.tsx        /service/<slug> detail pages
├── data/
│   ├── services.ts            SERVICES catalogue (9 services)
│   └── service-options.ts     shared <select> option groups + title matcher
└── hooks/useReveal.ts         reveal-on-scroll
```

## Glass header
`Header.tsx` renders distortion/tint/highlight layers; `arp.css` scopes them to
`.site-header.scrolled` inside `@media (min-width:901px)` — mobile keeps the solid bar.
The `GlassFilter` SVG (id `glass-distortion`) is mounted once in `App.tsx`.

## Dev
```bash
npm run dev      # http://localhost:5174
npm run build    # type-check, bundle, and generate blog and project HTML
npm run preview  # http://localhost:5174
```
Assets live in `public/assets/**` (images, logos, favicon).

Keep the preview's Vite dependency cache separate from SSR tasks. The live preview
uses `node_modules/.vite`, prerendering uses `.vite-prerender`, and project tests
use `.vite-project-tests`. Sharing these caches can leave the preview showing only
its background poster after edits and tests. If an older test run has already
affected a running preview, restart `npm run dev` and reload the page once.

## Commercial roofing blog

Edit the article entries in `src/content/blog-operations.json` and `src/content/blog-planning.json`. Use a stable slug, a unique description, a publication date for new posts, an image key from `src/data/blog.ts`, and service IDs from `src/data/services.ts`. Use `[label](URL)` for inline references and service links.

`npm run build` writes the blog index, article HTML, `dist/sitemap.xml` and `dist/robots.txt`. Deploy `dist` so crawlers can fetch the sitemap at `https://aucklandroofprofessionals.nz/sitemap.xml`. Preview the production output with `npm run serve`.

### Page metadata

Edit titles and descriptions for fixed pages in `src/lib/page-seo.ts`. Add fixed routes to the matching route map in `src/App.tsx`. New services, blog articles and case studies take their metadata from their content records and are included in the built HTML and sitemap automatically. Run `npm run build` and `npm test` to check titles, descriptions, canonicals and social tags across the site.

Record the actual date of a significant content edit as `lastModified` in the page SEO entry or the service, project or blog record, using `YYYY-MM-DD`. The next build uses it as `lastmod`. Blog articles use their publication date until a revision date is recorded. Pages without a known date omit the optional tag.

Canonical URLs use `https://aucklandroofprofessionals.nz` with lowercase, extensionless paths and a trailing slash only at the root. Node and Cloudflare permanently redirect legacy service links to the matching service path and preserve campaign attribution on the redirect. Canonical tags and the sitemap contain the clean URL.

The build puts Open Graph and X Card tags in the initial HTML. Run `npm run og:generate` after adding a service or project with portfolio photography to generate its 1200 × 630 JPEG in `public/assets/social`. Replace a published card at a new versioned path so crawlers fetch the new image. The build checks that each selected image is present, correctly sized and under 300 KB.

Deploy `dist` to the public HTTPS site before testing the URLs in [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/). Check X and WhatsApp by pasting a link into an unsent draft. Each preview image URL should return HTTP 200 with `Content-Type: image/jpeg` directly. If assets are served from a separate public HTTPS origin, set `VITE_SITE_URL` at build time to the origin serving those assets.

## Project case studies

All five carousel projects have individual `/projects/<slug>` pages. Edit their shared catalogue in `src/data/projects.ts`; the carousel, page navigation and build use the same records. The layout is in `src/pages/ProjectPage.tsx` with scoped styles in `src/project.css`.

The existing portfolio supplies the scope, duration and introduction. Detailed milestones, client feedback and measured outcomes remain explicitly labelled placeholders. Only replace them with documented project information. Takapuna and Devonport use representative service imagery; confirm project photography before removing those labels. Do not attribute general company reviews to these projects.

The build creates five standalone HTML pages, unique metadata, breadcrumb structured data and sitemap entries. Unknown project URLs return 404 on the configured production hosts. `tests/projects.test.js` checks all 15 carousel cards, project content, images, metadata, chapter links and wraparound navigation.

## Responsive verification

Shared layouts remain in `src/arp.css`; the compact navigation extends the existing glass header in `src/navigation.css`. The menu switches below 1200px, while content grids adapt independently to their available space. Blog, project, contact and enquiry styles stay in their existing scoped files.

With the local development server running, repeat the browser checks using installed Chrome or Edge:

```bash
node scripts/responsive-audit.js --origin http://127.0.0.1:5174 --label final --screenshots --interactions
node scripts/responsive-audit.js --origin http://127.0.0.1:5174 --label static-final --routes /404.html,/social-preview.html --static-interactions
```

The audit covers all 34 application routes/data variants at 320, 360, 375, 390, 414, 480, 768, 820, 1024, 1280, 1366, 1440 and 1920px, plus the two standalone pages in the second command. Reports and screenshots are saved under `artifacts/responsive/<label>/`. Form submissions are intercepted locally. Browser emulation covers layout, keyboard, synthesized touch and reduced motion; physical iPhone/Android and Safari/Firefox verification remain separate checks.

Project imagery uses the original files plus 600px and 1000px WebP variants. Regenerate those variants after replacing a source photograph with `node scripts/generate-responsive-images.js`. Run `npm run build` and `npm test` before release.

## HTTP security and CORS

Production serves an enforced Content Security Policy, host-only HSTS over HTTPS, MIME-sniffing protection, clickjacking protection, and restricted referrer and browser permissions. The policy permits Google Fonts, the Google Maps embed and the Cloudinary hero video at their configured locations.

The forms use the same origin as the site. For a separate frontend, set comma-separated HTTPS origins in the backend's `ALLOWED_ORIGINS` environment variable. Development uses `DEV_ALLOWED_ORIGINS` and may list explicit HTTP origins. Leaving either list empty grants no cross-origin access. The three form endpoints permit cross-origin POST with `Content-Type` and omit credential grants. Static files have no CORS grants.

Cloudflare Pages and Workers return a secured HTTP 503 for the form API. Form delivery requires a backend.

See [Security and deployment configuration](SECURITY.md) for runtime settings and deployment checks. The live Cloudflare Pages project is `auckland-roof-professionals`. [Production release repository](https://github.com/kushalknz-ops/auckland-roof-professionals#cloudflare-pages-https)

See [Production monitoring](MONITORING.md) for Sentry activation, alert rules, retention, and fault verification.
