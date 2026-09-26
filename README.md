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
│   │   └── liquid-glass.tsx   GlassEffect / GlassDock / GlassButton / GlassFilter (+ demo Component)
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
│   └── ServicePage.tsx        /service?id=<slug> detail pages
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
npm run build    # tsc -b && vite build
```
Assets live in `public/assets/**` (images, logos, favicon).
