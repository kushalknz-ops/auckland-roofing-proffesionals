/**
 * Open Graph & Twitter Card Social Preview Integrity Tests
 * Auckland Roof Professionals
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { JSDOM } from 'jsdom'
import { createRequestHandler } from '../server.js'
import { onRequest } from '../functions/_middleware.js'
import worker from '../server/static-worker.js'
import { SERVICES } from '../src/data/services.ts'
import { PROJECTS, projectPath } from '../src/data/projects.ts'
import operations from '../src/content/blog-operations.json' with { type: 'json' }
import planning from '../src/content/blog-planning.json' with { type: 'json' }
import { normalizeCanonicalUrl } from '../src/hooks/useSEO.ts'
import {
  DEFAULT_ORIGIN,
  DEFAULT_OG_IMAGE,
  DEFAULT_SITE_NAME,
  DEFAULT_LOCALE,
} from '../src/lib/social-metadata.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.resolve(projectRoot, 'public')
const publicAssetsDir = path.resolve(publicDir, 'assets')

let server
let baseUrl

test.before(async () => {
  server = http.createServer(createRequestHandler())
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

test.after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

// ============================================================
// 1. STATIC HTML OPEN GRAPH & TWITTER TAGS (index.html)
// ============================================================
test('Open Graph & Twitter Tags - Root index.html', async (t) => {
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8')

  await t.test('configures og:title, og:description, og:url, og:type, og:site_name, og:locale', () => {
    assert.match(indexHtml, /<meta\s+property="og:type"\s+content="website"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:locale"\s+content="en_NZ"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:site_name"\s+content="Auckland Roof Professionals"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:title"\s+content="Auckland Roof Professionals \| [^"]+"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:description"\s+content="[^"]+"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:url"\s+content="https:\/\/aucklandroofprofessionals\.nz\/"\s*\/?>/i)
  })

  await t.test('configures absolute HTTPS og:image with full dimensions, type, and alt tags', () => {
    assert.match(indexHtml, /<meta\s+property="og:image"\s+content="https:\/\/aucklandroofprofessionals\.nz\/assets\/social\/roofing-v2\.jpg"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:image:secure_url"\s+content="https:\/\/aucklandroofprofessionals\.nz\/assets\/social\/roofing-v2\.jpg"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:image:type"\s+content="image\/jpeg"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:image:width"\s+content="1200"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:image:height"\s+content="630"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:image:alt"\s+content="[^"]+"\s*\/?>/i)
  })

  await t.test('configures Twitter Card metadata for X', () => {
    assert.match(indexHtml, /<meta\s+name="twitter:card"\s+content="summary_large_image"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+name="twitter:title"\s+content="Auckland Roof Professionals \| [^"]+"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+name="twitter:description"\s+content="[^"]+"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+name="twitter:image"\s+content="https:\/\/aucklandroofprofessionals\.nz\/assets\/social\/roofing-v2\.jpg"\s*\/?>/i)
  })
})

// ============================================================
// 2. SOCIAL PREVIEW IMAGE FILE INTEGRITY & CONSTRAINTS
// ============================================================
test('Social Preview Image File Integrity & Platform Constraints', async (t) => {
  const imageSpecs = [
    { name: 'social/roofing-v2.jpg', maxKb: 300 },
    { name: 'social/commercial-v2.jpg', maxKb: 300 },
    { name: 'social/residential-v2.jpg', maxKb: 300 },
    { name: 'social/contact-v2.jpg', maxKb: 300 },
  ]

  for (const img of imageSpecs) {
    await t.test(`${img.name} is a 1200x630 JPEG under 300 KB`, async () => {
      const pubPath = path.join(publicAssetsDir, img.name)

      assert.ok(fs.existsSync(pubPath), `File public/assets/${img.name} must exist`)

      const stats = fs.statSync(pubPath)
      const sizeKb = stats.size / 1024
      assert.ok(
        sizeKb < img.maxKb,
        `${img.name} size (${Math.round(sizeKb)}KB) must be under ${img.maxKb}KB for WhatsApp preview delivery`
      )

      const meta = await sharp(pubPath).metadata()
      assert.equal(meta.width, 1200, `${img.name} width must be exactly 1200px`)
      assert.equal(meta.height, 630, `${img.name} height must be exactly 630px`)
      assert.equal(meta.format, 'jpeg', `${img.name} must be a JPEG image`)

      // Check aspect ratio (approx 1.905)
      const ratio = meta.width / meta.height
      assert.ok(Math.abs(ratio - 1.905) < 0.01, `${img.name} aspect ratio must match standard 1.91:1`)
    })
  }
})

// ============================================================
// 3. CRAWLER-READY HTML RESPONSES
// ============================================================
test('Server-Side Crawler Metadata Responses', async (t) => {
  await t.test('GET / serves homepage Open Graph metadata', async () => {
    const res = await fetch(`${baseUrl}/`, {
      headers: { 'X-Forwarded-For': '198.51.100.150' },
    })
    assert.equal(res.status, 200)
    const html = await res.text()

    assert.match(html, /<meta property="og:title" content="Auckland Roof Professionals \| Roofing &amp; Re-Roofing" \/>/)
    assert.match(html, /<meta property="og:url" content="https:\/\/aucklandroofprofessionals\.nz\/" \/>/)
    assert.match(html, /<meta property="og:image" content="https:\/\/aucklandroofprofessionals\.nz\/assets\/social\/roofing-v2\.jpg" \/>/)
    assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/)
  })

  await t.test('GET /commercial serves commercial-specific metadata and social/commercial-v2.jpg', async () => {
    const res = await fetch(`${baseUrl}/commercial`, {
      headers: { 'X-Forwarded-For': '198.51.100.151' },
    })
    assert.equal(res.status, 200)
    const html = await res.text()

    assert.match(html, /<meta property="og:title" content="Commercial Roofing &amp; Cladding in Auckland \| ARP Roofers" \/>/)
    assert.match(html, /<meta property="og:url" content="https:\/\/aucklandroofprofessionals\.nz\/commercial" \/>/)
    assert.match(html, /<meta property="og:image" content="https:\/\/aucklandroofprofessionals\.nz\/assets\/social\/commercial-v2\.jpg" \/>/)
  })

  await t.test('GET /residential serves residential-specific metadata and social/residential-v2.jpg', async () => {
    const res = await fetch(`${baseUrl}/residential`, {
      headers: { 'X-Forwarded-For': '198.51.100.152' },
    })
    assert.equal(res.status, 200)
    const html = await res.text()

    assert.match(html, /<meta property="og:title" content="Residential Roofing &amp; Re-Roofing in Auckland \| ARP" \/>/)
    assert.match(html, /<meta property="og:url" content="https:\/\/aucklandroofprofessionals\.nz\/residential" \/>/)
    assert.match(html, /<meta property="og:image" content="https:\/\/aucklandroofprofessionals\.nz\/assets\/social\/residential-v2\.jpg" \/>/)
  })

  await t.test('GET /contact serves contact-specific metadata and social/contact-v2.jpg', async () => {
    const res = await fetch(`${baseUrl}/contact`, {
      headers: { 'X-Forwarded-For': '198.51.100.153' },
    })
    assert.equal(res.status, 200)
    const html = await res.text()

    assert.match(html, /<meta property="og:title" content="Free Roofing Quotes \| Contact Auckland Roof Professionals" \/>/)
    assert.match(html, /<meta property="og:url" content="https:\/\/aucklandroofprofessionals\.nz\/contact" \/>/)
    assert.match(html, /<meta property="og:image" content="https:\/\/aucklandroofprofessionals\.nz\/assets\/social\/contact-v2\.jpg" \/>/)
  })

  await t.test('legacy service URLs redirect directly to service-specific metadata', async () => {
    const res = await fetch(`${baseUrl}/SERVICE/?id=METAL-ROOFS-CLADDING&utm_source=test`, {
      redirect: 'manual',
      headers: { 'X-Forwarded-For': '198.51.100.154' },
    })
    assert.equal(res.status, 301)
    assert.equal(res.headers.get('location'), '/service/metal-roofs-cladding?utm_source=test')
    const service = await fetch(new URL(res.headers.get('location'), baseUrl), { redirect: 'manual' })
    assert.equal(service.status, 200)
    const html = await service.text()

    assert.match(html, /<meta property="og:title" content="Commercial Metal Roofs &amp; Wall Cladding Auckland \| ARP" \/>/)
    assert.match(html, /<meta property="og:url" content="https:\/\/aucklandroofprofessionals\.nz\/service\/metal-roofs-cladding" \/>/)
  })

  await t.test('GET /assets/social/roofing-v2.jpg delivers image with 200 OK and cache headers', async () => {
    const res = await fetch(`${baseUrl}/assets/social/roofing-v2.jpg`)
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'image/jpeg')
    assert.equal(res.headers.get('access-control-allow-origin'), null)
    assert.match(res.headers.get('cache-control') || '', /public/)
    const buf = await res.arrayBuffer()
    assert.ok(buf.byteLength > 20000, 'Image bytes should be loaded successfully')
  })
})

test('all canonical pages have unique metadata in their initial HTML', async () => {
  const sitemapResponse = await fetch(`${baseUrl}/sitemap.xml`, { redirect: 'manual' })
  assert.equal(sitemapResponse.status, 200)
  assert.match(sitemapResponse.headers.get('content-type'), /^application\/xml; charset=utf-8$/i)
  const { window: xml } = new JSDOM(await sitemapResponse.text(), { contentType: 'application/xml' })
  const namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
  const canonicalUrls = []
  try {
    const root = xml.document.documentElement
    assert.equal(root.localName, 'urlset')
    assert.equal(root.namespaceURI, namespace)
    for (const url of root.children) {
      assert.equal(url.localName, 'url')
      assert.equal(url.namespaceURI, namespace)
      const locations = url.getElementsByTagNameNS(namespace, 'loc')
      assert.equal(locations.length, 1)
      canonicalUrls.push(locations[0].textContent)
      const dates = url.getElementsByTagNameNS(namespace, 'lastmod')
      assert.ok(dates.length <= 1)
      if (dates.length) {
        const date = dates[0].textContent
        assert.match(date, /^\d{4}-\d{2}-\d{2}$/)
        assert.equal(new Date(date).toISOString().slice(0, 10), date)
      }
      for (const image of url.getElementsByTagNameNS('http://www.google.com/schemas/sitemap-image/1.1', 'loc')) {
        const { origin, pathname } = new URL(image.textContent)
        assert.equal(origin, DEFAULT_ORIGIN)
        const response = await fetch(baseUrl + pathname, { method: 'HEAD', redirect: 'manual' })
        assert.equal(response.status, 200, pathname)
        assert.match(response.headers.get('content-type'), /^image\//)
      }
    }
  } finally {
    xml.close()
  }
  const expectedPaths = [
    '/', '/commercial', '/residential', '/contact', '/privacy-policy', '/terms-and-conditions', '/blog',
    ...SERVICES.map(({ id }) => `/service/${id}`),
    ...PROJECTS.map(projectPath),
    ...[...operations, ...planning].map(({ slug }) => `/blog/${slug}`),
  ]
  assert.deepEqual(canonicalUrls.toSorted(), expectedPaths.map((route) => DEFAULT_ORIGIN + route).sort())
  const robotsResponse = await fetch(`${baseUrl}/robots.txt`, { redirect: 'manual' })
  assert.equal(robotsResponse.status, 200)
  const robots = await robotsResponse.text()
  assert.deepEqual(robots.match(/^Sitemap:.*$/gim), [`Sitemap: ${DEFAULT_ORIGIN}/sitemap.xml`])

  const titles = new Set()
  const descriptions = new Set()
  const checkedImages = new Set()
  const crawlers = ['facebookexternalhit/1.1', 'LinkedInBot/1.0', 'Twitterbot/1.0', 'WhatsApp/2.24']
  for (const canonical of canonicalUrls) {
    const route = new URL(canonical).pathname
    assert.equal(canonical, DEFAULT_ORIGIN + route)
    assert.match(route, /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/)
    const headers = { 'User-Agent': crawlers[titles.size % crawlers.length] }
    const response = await fetch(baseUrl + route, { redirect: 'manual', headers })
    assert.equal(response.status, 200, route)
    assert.doesNotMatch(response.headers.get('link') ?? '', /rel="?canonical/i)
    const variant = await fetch(baseUrl + route + '?utm_source=test&sessionid=test', { redirect: 'manual' })
    assert.equal(variant.status, 200, route)
    const { window } = new JSDOM(await response.text())
    try {
      const { head, title } = window.document
      const read = (selector, attribute = 'content') => {
        assert.equal(head.querySelectorAll(selector).length, 1, `${route} ${selector}`)
        return head.querySelector(selector).getAttribute(attribute)
      }
      const description = read('meta[name="description"]')
      assert.equal(head.querySelectorAll('title').length, 1, route)
      assert.ok(title.length >= 50 && title.length <= 60 && !titles.has(title), route)
      assert.ok(description.length >= 150 && description.length <= 160 && !descriptions.has(description), route)
      assert.equal(read('link[rel="canonical"]', 'href'), canonical)
      assert.ok((await variant.text()).includes(`<link rel="canonical" href="${canonical}"`))
      assert.equal(read('meta[property="og:url"]'), canonical)
      assert.equal(read('meta[property="og:title"]'), title)
      assert.equal(read('meta[name="twitter:title"]'), title)
      assert.equal(read('meta[property="og:description"]'), description)
      assert.equal(read('meta[name="twitter:description"]'), description)
      assert.equal(read('meta[property="og:site_name"]'), DEFAULT_SITE_NAME)
      assert.equal(read('meta[property="og:locale"]'), DEFAULT_LOCALE)
      assert.equal(read('meta[property="og:type"]'), /^\/(blog|projects)\//.test(route) ? 'article' : 'website')
      assert.equal(read('meta[name="twitter:card"]'), 'summary_large_image')
      const image = read('meta[property="og:image"]')
      assert.equal(read('meta[property="og:image:secure_url"]'), image)
      assert.equal(read('meta[name="twitter:image"]'), image)
      const alt = read('meta[property="og:image:alt"]')
      assert.ok(alt.trim(), route)
      assert.equal(read('meta[name="twitter:image:alt"]'), alt)
      const imageUrl = new URL(image)
      assert.equal(imageUrl.origin, DEFAULT_ORIGIN)
      assert.match(imageUrl.pathname, /^\/assets\//)
      assert.equal(read('meta[property="og:image:type"]'), 'image/jpeg')
      assert.equal(read('meta[property="og:image:width"]'), '1200')
      assert.equal(read('meta[property="og:image:height"]'), '630')
      if (!checkedImages.has(image)) {
        const asset = await fetch(baseUrl + imageUrl.pathname, { redirect: 'manual', headers })
        assert.equal(asset.status, 200, image)
        assert.equal(asset.headers.get('content-type'), 'image/jpeg')
        const bytes = Buffer.from(await asset.arrayBuffer())
        assert.ok(bytes.length < 300_000, image)
        const { format, width, height } = await sharp(bytes).metadata()
        assert.deepEqual({ format, width, height }, { format: 'jpeg', width: 1200, height: 630 }, image)
        checkedImages.add(image)
      }
      assert.doesNotMatch(read('meta[name="robots"]'), /noindex/)
      assert.doesNotMatch(response.headers.get('x-robots-tag') ?? '', /noindex/)
      titles.add(title)
      descriptions.add(description)
    } finally {
      window.close()
    }
  }
})

test('utility and error pages have fallback cards and retain noindex', async () => {
  for (const [route, status, ogPath] of [
    ['/social-preview.html', 200, '/social-preview.html'],
    ['/404', 200, '/404'],
    ['/404.html', 200, '/404'],
    ['/blog/unknown', 404, '/404'],
    ['/service?id=unknown', 404, '/service-not-found'],
  ]) {
    const response = await fetch(baseUrl + route, { redirect: 'manual' })
    assert.equal(response.status, status, route)
    const { window } = new JSDOM(await response.text())
    try {
      const { head, title } = window.document
      assert.match(head.querySelector('meta[name="robots"]').content, /noindex/)
      assert.equal(head.querySelector('link[rel="canonical"]'), null)
      assert.equal(head.querySelector('meta[property="og:url"]').content, DEFAULT_ORIGIN + ogPath)
      assert.equal(head.querySelector('meta[property="og:title"]').content, title)
      assert.equal(head.querySelector('meta[property="og:image"]').content, DEFAULT_OG_IMAGE)
      assert.equal(head.querySelector('meta[name="twitter:image"]').content, DEFAULT_OG_IMAGE)
    } finally {
      window.close()
    }
  }
})

test('Pages and Workers resolve page aliases before client JavaScript runs', async () => {
  const env = {
    ASSETS: {
      async fetch(request) {
        const { pathname } = new URL(request.url)
        const file = path.join(projectRoot, 'dist', pathname === '/' ? 'index.html' : `${pathname}.html`)
        if (!fs.existsSync(file)) return new Response(null, { status: 404 })
        return new Response(request.method === 'HEAD' ? null : fs.readFileSync(file), {
          headers: { 'Content-Type': 'text/html' },
        })
      },
    },
  }
  for (const serve of [
    (request) => onRequest({ request, env, next: () => env.ASSETS.fetch(request) }),
    (request) => worker.fetch(request, env),
  ]) {
    for (const id of ['ASPHALT-SHINGLES', 'roof-safety-systems', 'asset-maintenance']) {
      const request = new Request(`${DEFAULT_ORIGIN}/service?id=${id}&utm_source=test`)
      const response = await serve(request)
      assert.equal(response.status, 301)
      assert.equal(response.headers.get('location'), `${DEFAULT_ORIGIN}/service/${id.toLowerCase()}?utm_source=test`)
    }
    for (const [variant, target] of [
      ['/service-default', `/service/${SERVICES[0].id}`],
      ['/INDEX.html', '/'],
      ['/BLOG/Commercial-Roof-Maintenance.html/', '/blog/commercial-roof-maintenance'],
      ['/Projects/Remuera-Villa-Re-Roof/', '/projects/remuera-villa-re-roof'],
    ]) {
      const request = new Request(`http://www.aucklandroofprofessionals.nz${variant}`, { method: 'HEAD' })
      const response = await serve(request)
      assert.equal(response.status, 301, variant)
      assert.equal(response.headers.get('location'), DEFAULT_ORIGIN + target, variant)
      assert.equal((await serve(new Request(DEFAULT_ORIGIN + target))).status, 200, target)
    }
    const missing = await serve(new Request(`${DEFAULT_ORIGIN}/service?id=missing`))
    assert.equal(missing.status, 404)
    const html = await missing.text()
    assert.match(html, /<meta name="robots" content="noindex, nofollow"/)
    assert.doesNotMatch(html, /rel="canonical"/)
  }
})

// ============================================================
// 4. CLIENT-SIDE useSEO HOOK LOGIC
// ============================================================
test('Client Hook useSEO Logic & Normalization', async (t) => {
  await t.test('default origin and image are correctly configured', () => {
    assert.equal(DEFAULT_ORIGIN, 'https://aucklandroofprofessionals.nz')
    assert.equal(DEFAULT_OG_IMAGE, 'https://aucklandroofprofessionals.nz/assets/social/roofing-v2.jpg')
    assert.equal(DEFAULT_SITE_NAME, 'Auckland Roof Professionals')
    assert.equal(DEFAULT_LOCALE, 'en_NZ')
  })

  await t.test('normalizeCanonicalUrl standardizes URLs correctly', () => {
    assert.equal(normalizeCanonicalUrl('/'), 'https://aucklandroofprofessionals.nz/')
    assert.equal(normalizeCanonicalUrl('/commercial/'), 'https://aucklandroofprofessionals.nz/commercial')
    assert.equal(normalizeCanonicalUrl('/residential'), 'https://aucklandroofprofessionals.nz/residential')
    assert.equal(normalizeCanonicalUrl('https://aucklandroofprofessionals.nz/contact#top'), 'https://aucklandroofprofessionals.nz/contact')
    assert.equal(normalizeCanonicalUrl('http://preview.example/Blog//Roofing/?utm_source=test&sessionid=1#top'), `${DEFAULT_ORIGIN}/blog/roofing`)
  })
})
