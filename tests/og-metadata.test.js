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
import { createRequestHandler } from '../server.js'
import { resolveMetadata, injectOpenGraphMetadata } from '../server/seo.js'
import {
  DEFAULT_ORIGIN,
  DEFAULT_OG_IMAGE,
  DEFAULT_SITE_NAME,
  DEFAULT_LOCALE,
  normalizeCanonicalUrl,
} from '../src/hooks/useSEO.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.resolve(projectRoot, 'public')
const assetsDir = path.resolve(projectRoot, 'assets')
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
    assert.match(indexHtml, /<meta\s+property="og:image"\s+content="https:\/\/aucklandroofprofessionals\.nz\/assets\/og-image\.jpg"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:image:secure_url"\s+content="https:\/\/aucklandroofprofessionals\.nz\/assets\/og-image\.jpg"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:image:type"\s+content="image\/jpeg"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:image:width"\s+content="1200"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:image:height"\s+content="630"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+property="og:image:alt"\s+content="[^"]+"\s*\/?>/i)
  })

  await t.test('configures Twitter Card metadata for X', () => {
    assert.match(indexHtml, /<meta\s+name="twitter:card"\s+content="summary_large_image"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+name="twitter:title"\s+content="Auckland Roof Professionals \| [^"]+"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+name="twitter:description"\s+content="[^"]+"\s*\/?>/i)
    assert.match(indexHtml, /<meta\s+name="twitter:image"\s+content="https:\/\/aucklandroofprofessionals\.nz\/assets\/og-image\.jpg"\s*\/?>/i)
  })
})

// ============================================================
// 2. SOCIAL PREVIEW IMAGE FILE INTEGRITY & CONSTRAINTS
// ============================================================
test('Social Preview Image File Integrity & Platform Constraints', async (t) => {
  const imageSpecs = [
    { name: 'og-image.jpg', maxKb: 300 },
    { name: 'og-commercial.jpg', maxKb: 300 },
    { name: 'og-residential.jpg', maxKb: 300 },
    { name: 'og-contact.jpg', maxKb: 300 },
  ]

  for (const img of imageSpecs) {
    await t.test(`${img.name} exists, has exact 1200x630 dimensions, and satisfies WhatsApp <300KB limit`, async () => {
      const pubPath = path.join(publicAssetsDir, img.name)
      const mirrorPath = path.join(assetsDir, img.name)

      assert.ok(fs.existsSync(pubPath), `File public/assets/${img.name} must exist`)
      assert.ok(fs.existsSync(mirrorPath), `File assets/${img.name} must exist`)

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
// 3. SERVER-SIDE DYNAMIC CRAWLER INJECTION
// ============================================================
test('Server-Side Dynamic Crawler Metadata Responses', async (t) => {
  await t.test('GET / serves homepage Open Graph metadata', async () => {
    const res = await fetch(`${baseUrl}/`, {
      headers: { 'X-Forwarded-For': '198.51.100.150' },
    })
    assert.equal(res.status, 200)
    const html = await res.text()

    assert.match(html, /<meta property="og:title" content="Auckland Roof Professionals \| Commercial &amp; Residential Roofing Auckland" \/>/)
    assert.match(html, /<meta property="og:url" content="https:\/\/aucklandroofprofessionals\.nz\/" \/>/)
    assert.match(html, /<meta property="og:image" content="https:\/\/aucklandroofprofessionals\.nz\/assets\/og-image\.jpg" \/>/)
    assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/)
  })

  await t.test('GET /commercial serves commercial-specific metadata and og-commercial.jpg', async () => {
    const res = await fetch(`${baseUrl}/commercial`, {
      headers: { 'X-Forwarded-For': '198.51.100.151' },
    })
    assert.equal(res.status, 200)
    const html = await res.text()

    assert.match(html, /<meta property="og:title" content="Commercial Roofing Services Auckland \| Auckland Roof Professionals" \/>/)
    assert.match(html, /<meta property="og:url" content="https:\/\/aucklandroofprofessionals\.nz\/commercial" \/>/)
    assert.match(html, /<meta property="og:image" content="https:\/\/aucklandroofprofessionals\.nz\/assets\/og-commercial\.jpg" \/>/)
  })

  await t.test('GET /residential serves residential-specific metadata and og-residential.jpg', async () => {
    const res = await fetch(`${baseUrl}/residential`, {
      headers: { 'X-Forwarded-For': '198.51.100.152' },
    })
    assert.equal(res.status, 200)
    const html = await res.text()

    assert.match(html, /<meta property="og:title" content="Residential Roofing Auckland \| Shingles &amp; Metal Roofs \| Auckland Roof Professionals" \/>/)
    assert.match(html, /<meta property="og:url" content="https:\/\/aucklandroofprofessionals\.nz\/residential" \/>/)
    assert.match(html, /<meta property="og:image" content="https:\/\/aucklandroofprofessionals\.nz\/assets\/og-residential\.jpg" \/>/)
  })

  await t.test('GET /contact serves contact-specific metadata and og-contact.jpg', async () => {
    const res = await fetch(`${baseUrl}/contact`, {
      headers: { 'X-Forwarded-For': '198.51.100.153' },
    })
    assert.equal(res.status, 200)
    const html = await res.text()

    assert.match(html, /<meta property="og:title" content="Contact Auckland Roof Professionals \| Free Roof Quotes &amp; Emergencies" \/>/)
    assert.match(html, /<meta property="og:url" content="https:\/\/aucklandroofprofessionals\.nz\/contact" \/>/)
    assert.match(html, /<meta property="og:image" content="https:\/\/aucklandroofprofessionals\.nz\/assets\/og-contact\.jpg" \/>/)
  })

  await t.test('GET /service?id=metal-roofs-cladding serves service-specific metadata', async () => {
    const res = await fetch(`${baseUrl}/service?id=metal-roofs-cladding`, {
      headers: { 'X-Forwarded-For': '198.51.100.154' },
    })
    assert.equal(res.status, 200)
    const html = await res.text()

    assert.match(html, /<meta property="og:title" content="Commercial Metal Roofs &amp; Wall Cladding Auckland \| ARP" \/>/)
    assert.match(html, /<meta property="og:url" content="https:\/\/aucklandroofprofessionals\.nz\/service\?id=metal-roofs-cladding" \/>/)
  })

  await t.test('GET /assets/og-image.jpg delivers image with 200 OK, CORS, and cache headers', async () => {
    const res = await fetch(`${baseUrl}/assets/og-image.jpg`)
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'image/jpeg')
    assert.equal(res.headers.get('access-control-allow-origin'), '*')
    assert.match(res.headers.get('cache-control') || '', /public/)
    const buf = await res.arrayBuffer()
    assert.ok(buf.byteLength > 20000, 'Image bytes should be loaded successfully')
  })
})

// ============================================================
// 4. CLIENT-SIDE useSEO HOOK LOGIC
// ============================================================
test('Client Hook useSEO Logic & Normalization', async (t) => {
  await t.test('default origin and image are correctly configured', () => {
    assert.equal(DEFAULT_ORIGIN, 'https://aucklandroofprofessionals.nz')
    assert.equal(DEFAULT_OG_IMAGE, 'https://aucklandroofprofessionals.nz/assets/og-image.jpg')
    assert.equal(DEFAULT_SITE_NAME, 'Auckland Roof Professionals')
    assert.equal(DEFAULT_LOCALE, 'en_NZ')
  })

  await t.test('normalizeCanonicalUrl standardizes URLs correctly', () => {
    assert.equal(normalizeCanonicalUrl('/'), 'https://aucklandroofprofessionals.nz/')
    assert.equal(normalizeCanonicalUrl('/commercial/'), 'https://aucklandroofprofessionals.nz/commercial')
    assert.equal(normalizeCanonicalUrl('/residential'), 'https://aucklandroofprofessionals.nz/residential')
    assert.equal(normalizeCanonicalUrl('https://aucklandroofprofessionals.nz/contact#top'), 'https://aucklandroofprofessionals.nz/contact')
  })
})
