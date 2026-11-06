/**
 * Server-Side Open Graph & SEO Metadata Resolver & Injector
 * Auckland Roof Professionals
 */

const SITE_URL = 'https://aucklandroofprofessionals.nz'
const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/og-image.jpg`

const SERVICES_DATA = [
  {
    id: 'metal-roofs-cladding',
    title: 'Commercial Metal Roofs & Wall Cladding Auckland | ARP',
    description: 'Commercial metal roofing and architectural wall cladding in Auckland. Colorsteel® standing seam, long-run and Euro tray profiles engineered for NZ conditions.',
    img: `${SITE_URL}/assets/og-commercial.jpg`,
    alt: 'Commercial Metal Roofs & Wall Cladding Auckland',
  },
  {
    id: 'membrane-commercial',
    title: 'Commercial Membrane Roofing Auckland | TPO & Torch-On | ARP',
    description: 'Certified TPO and torch-on membrane waterproofing for commercial flat and low-slope roofs in Auckland. Substrate rebuilds, plant detailing & leak testing.',
    img: `${SITE_URL}/assets/og-commercial.jpg`,
    alt: 'Commercial Membrane Roofing Auckland',
  },
  {
    id: 'warmroof-commercial',
    title: 'Commercial Warm Roof Systems Auckland | PIR Insulated Roofs | ARP',
    description: 'Insulated commercial warm roof assemblies in Auckland. Eliminate condensation, slash energy costs, and exceed NZ Building Code H1 energy efficiency.',
    img: `${SITE_URL}/assets/og-commercial.jpg`,
    alt: 'Commercial Warm Roof Systems Auckland',
  },
  {
    id: 'shingles-residential',
    title: 'Architectural Asphalt Shingles Auckland | Residential Roofers | ARP',
    description: 'Premium asphalt shingle roofing for Auckland homes. Heritage aesthetics, 190+ km/h wind-resistance ratings, and multi-layer dimensional profiles.',
    img: `${SITE_URL}/assets/og-residential.jpg`,
    alt: 'Architectural Asphalt Shingles Auckland',
  },
  {
    id: 'metal-roofs-res',
    title: 'Residential Metal Roofing Auckland | Colorsteel® Long Run | ARP',
    description: 'Colorsteel® and corrugate metal roofing for Auckland homes. Specialists in architectural re-roofing, coastal coatings, and flashings backed by 10-year warranty.',
    img: `${SITE_URL}/assets/og-residential.jpg`,
    alt: 'Residential Metal Roofing Auckland',
  },
  {
    id: 'membrane-res',
    title: 'Residential Membrane Roofing Auckland | Decks & Flat Roofs | ARP',
    description: 'Watertight membrane solutions for Auckland residential flat roofs, rooftop decks, and box gutters. Certified applicators with proven leak-free track records.',
    img: `${SITE_URL}/assets/og-residential.jpg`,
    alt: 'Residential Membrane Roofing Auckland',
  },
  {
    id: 'warmroof-res',
    title: 'Residential Warm Roof Systems Auckland | Insulated Retrofits | ARP',
    description: 'Warm roof retrofits and installations for residential properties in Auckland. Energy-efficient, condensation-free living for cathedral ceilings and flat roofs.',
    img: `${SITE_URL}/assets/og-residential.jpg`,
    alt: 'Residential Warm Roof Systems Auckland',
  },
  {
    id: 'safety-maintenance',
    title: 'Roof Safety Systems & Asset Maintenance Auckland | ARP',
    description: 'Certified height safety anchor points, static lines, walkway systems, and programmed preventive maintenance schedules for Auckland commercial properties.',
    img: `${SITE_URL}/assets/og-commercial.jpg`,
    alt: 'Roof Safety Systems & Asset Maintenance Auckland',
  },
]

const STATIC_ROUTES = {
  '/': {
    title: 'Auckland Roof Professionals | Commercial & Residential Roofing Auckland',
    description: "Auckland's leading roofing specialists for commercial & residential projects. Metal roofs & cladding, membrane waterproofing, warm roofs & asphalt shingles. 10-year warranty. Free quote.",
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/assets/og-image.jpg`,
    imageAlt: 'Auckland Roof Professionals - Commercial & Residential Roofing Auckland',
  },
  '/commercial': {
    title: 'Commercial Roofing Services Auckland | Auckland Roof Professionals',
    description: 'Commercial roofing & cladding solutions across Auckland. Standing seam, TPO membrane, warm roof systems, height safety & maintenance. 10-year warranty.',
    url: `${SITE_URL}/commercial`,
    image: `${SITE_URL}/assets/og-commercial.jpg`,
    imageAlt: 'Auckland Commercial Roofing & Cladding Specialists - Auckland Roof Professionals',
  },
  '/residential': {
    title: 'Residential Roofing Auckland | Shingles & Metal Roofs | Auckland Roof Professionals',
    description: 'Specialist residential roofing in Auckland: architectural asphalt shingles, Colorsteel® long run metal roofs, membrane decks & warm roofs. Free quotes.',
    url: `${SITE_URL}/residential`,
    image: `${SITE_URL}/assets/og-residential.jpg`,
    imageAlt: 'Auckland Residential Roofing & Re-Roofing Specialists - Auckland Roof Professionals',
  },
  '/contact': {
    title: 'Contact Auckland Roof Professionals | Free Roof Quotes & Emergencies',
    description: 'Contact our Auckland roofing team for free assessments, quotes and rapid leak assistance. Call 0800 555 766 or visit 59 Porana Rd, Glenfield.',
    url: `${SITE_URL}/contact`,
    image: `${SITE_URL}/assets/og-contact.jpg`,
    imageAlt: 'Contact Auckland Roof Professionals - Free Quotes & Emergency Leak Repairs',
  },
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function resolveMetadata(reqUrl = '/') {
  const [urlPath, queryString] = reqUrl.split('?')
  const cleanPath = urlPath.length > 1 && urlPath.endsWith('/') ? urlPath.replace(/\/+$/, '') : urlPath

  // 1. Static Route Match
  if (STATIC_ROUTES[cleanPath]) {
    return STATIC_ROUTES[cleanPath]
  }

  // 2. Service detail page match (/service?id=...)
  if (cleanPath === '/service' && queryString) {
    const params = new URLSearchParams(queryString)
    const id = params.get('id')
    if (id) {
      const found = SERVICES_DATA.find((s) => s.id === id.toLowerCase())
      if (found) {
        return {
          title: found.title,
          description: found.description,
          url: `${SITE_URL}/service?id=${found.id}`,
          image: found.img,
          imageAlt: found.alt,
        }
      }
    }
  }

  // Fallback to default
  return STATIC_ROUTES['/']
}

export function injectOpenGraphMetadata(html, reqUrl = '/') {
  const meta = resolveMetadata(reqUrl)
  if (!meta) return html

  let out = html

  // Title
  if (meta.title) {
    const safeTitle = escapeHtml(meta.title)
    out = out.replace(/<title>.*?<\/title>/i, `<title>${safeTitle}</title>`)
    out = out.replace(/(<meta\s+property=["']og:title["']\s+content=["']).*?(["']\s*\/?>)/i, `$1${safeTitle}$2`)
    out = out.replace(/(<meta\s+name=["']twitter:title["']\s+content=["']).*?(["']\s*\/?>)/i, `$1${safeTitle}$2`)
  }

  // Description
  if (meta.description) {
    const safeDesc = escapeHtml(meta.description)
    out = out.replace(/(<meta\s+name=["']description["']\s+content=["']).*?(["']\s*\/?>)/i, `$1${safeDesc}$2`)
    out = out.replace(/(<meta\s+property=["']og:description["']\s+content=["']).*?(["']\s*\/?>)/i, `$1${safeDesc}$2`)
    out = out.replace(/(<meta\s+name=["']twitter:description["']\s+content=["']).*?(["']\s*\/?>)/i, `$1${safeDesc}$2`)
  }

  // Canonical & OG URL
  if (meta.url) {
    out = out.replace(/(<link\s+rel=["']canonical["']\s+href=["']).*?(["']\s*\/?>)/i, `$1${meta.url}$2`)
    out = out.replace(/(<meta\s+property=["']og:url["']\s+content=["']).*?(["']\s*\/?>)/i, `$1${meta.url}$2`)
  }

  // Image & Secure Image URL
  if (meta.image) {
    out = out.replace(/(<meta\s+property=["']og:image["']\s+content=["']).*?(["']\s*\/?>)/i, `$1${meta.image}$2`)
    out = out.replace(/(<meta\s+property=["']og:image:secure_url["']\s+content=["']).*?(["']\s*\/?>)/i, `$1${meta.image}$2`)
    out = out.replace(/(<meta\s+name=["']twitter:image["']\s+content=["']).*?(["']\s*\/?>)/i, `$1${meta.image}$2`)
  }

  // Image Alt
  if (meta.imageAlt) {
    const safeAlt = escapeHtml(meta.imageAlt)
    out = out.replace(/(<meta\s+property=["']og:image:alt["']\s+content=["']).*?(["']\s*\/?>)/i, `$1${safeAlt}$2`)
    out = out.replace(/(<meta\s+name=["']twitter:image:alt["']\s+content=["']).*?(["']\s*\/?>)/i, `$1${safeAlt}$2`)
  }

  return out
}
