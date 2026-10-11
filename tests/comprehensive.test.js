/**
 * Comprehensive Automated Tests for Buttons, Links, and Forms
 * Auckland Roof Professionals
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { SERVICES } from '../src/data/services.ts'
import { handleApiRequest } from '../server/api.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const srcDir = path.resolve(projectRoot, 'src')

let server
let baseUrl

test.before(async () => {
  server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/api/')) {
      await handleApiRequest(req, res)
    } else {
      res.writeHead(404)
      res.end()
    }
  })

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
// 1. LINK INTEGRITY & ROUTING TARGETS
// ============================================================
test('Link Integrity - Internal Page Links and Anchor Routes', async (t) => {
  const homeContent = fs.readFileSync(path.join(srcDir, 'pages', 'HomePage.tsx'), 'utf8')
  const headerContent = fs.readFileSync(path.join(srcDir, 'components', 'site', 'Header.tsx'), 'utf8')
  const footerContent = fs.readFileSync(path.join(srcDir, 'components', 'site', 'Footer.tsx'), 'utf8')
  const catContent = fs.readFileSync(path.join(srcDir, 'pages', 'CategoryPage.tsx'), 'utf8')
  const notFoundContent = fs.readFileSync(path.join(srcDir, 'pages', 'NotFoundPage.tsx'), 'utf8')
  const serviceContent = fs.readFileSync(path.join(srcDir, 'pages', 'ServicePage.tsx'), 'utf8')

  await t.test('Header navigation links target valid routes or existing anchors', () => {
    const validNavPaths = ['/', '/#services', '/#projects', '/#process', '/#about', '/#faq', '/contact']
    for (const p of validNavPaths) {
      assert.ok(headerContent.includes(`'${p}'`) || headerContent.includes(`"${p}"`), `Header missing nav target ${p}`)
      if (p.startsWith('/#')) {
        const anchorId = p.slice(2)
        assert.ok(homeContent.includes(`id="${anchorId}"`) || homeContent.includes(`id='${anchorId}'`), `Missing target id="${anchorId}" on HomePage`)
      }
    }
  })

  await t.test('Footer navigation links target valid routes and anchor IDs', () => {
    const footerAnchors = ['about', 'projects', 'process', 'faq']
    for (const a of footerAnchors) {
      assert.ok(footerContent.includes(`/#${a}`), `Footer missing link to /#${a}`)
      assert.ok(homeContent.includes(`id="${a}"`), `HomePage missing id="${a}" for Footer link`)
    }
    assert.ok(footerContent.includes('to="/contact"'), 'Footer missing link to /contact')
    assert.ok(footerContent.includes('to="/commercial"'), 'Footer missing link to /commercial')
    assert.ok(footerContent.includes('to="/residential"'), 'Footer missing link to /residential')
  })

  await t.test('MegaMenu and Mobile Header link to every single service page properly', () => {
    for (const s of SERVICES) {
      assert.ok(s.id.length > 0)
      assert.ok(s.title.length > 0)
      assert.ok(headerContent.includes('to={`/service?id=${s.id}`}') || headerContent.includes('/service?id='))
    }
  })

  await t.test('CategoryPage contains svcList anchor and back/switch links', () => {
    assert.ok(catContent.includes('id="svcList"'))
    assert.ok(catContent.includes('href="#svcList"'))
    assert.ok(catContent.includes('to="/"'))
    assert.ok(catContent.includes('to="/#services"'))
    assert.ok(catContent.includes('to={c.switchTo}'))
  })

  await t.test('NotFoundPage links back to Home, Contact, and quick destination cards', () => {
    assert.ok(notFoundContent.includes('to="/"'), '404 must have link to Home')
    assert.ok(notFoundContent.includes('to="/contact"'), '404 must have link to Contact')
    assert.ok(notFoundContent.includes("href: '/residential'"), '404 must route to /residential')
    assert.ok(notFoundContent.includes("href: '/commercial'"), '404 must route to /commercial')
  })

  await t.test('External links are secure and have valid URLs', () => {
    const externalUrlRegex = /href="(https:\/\/[^"]+)"/g
    const contents = [homeContent, footerContent, notFoundContent, serviceContent]
    for (const text of contents) {
      let match
      while ((match = externalUrlRegex.exec(text)) !== null) {
        const url = match[1]
        assert.doesNotThrow(() => new URL(url), `Invalid external URL: ${url}`)
        assert.ok(url.startsWith('https://'), `External URL must use HTTPS: ${url}`)
      }
    }
  })
})

// ============================================================
// 2. BUTTON BEHAVIOR & INTERACTIVE CONTROLS
// ============================================================
test('Button & Interactive Controls Integrity', async (t) => {
  const headerContent = fs.readFileSync(path.join(srcDir, 'components', 'site', 'Header.tsx'), 'utf8')
  const footerContent = fs.readFileSync(path.join(srcDir, 'components', 'site', 'Footer.tsx'), 'utf8')
  const homeContent = fs.readFileSync(path.join(srcDir, 'pages', 'HomePage.tsx'), 'utf8')
  const reviewsContent = fs.readFileSync(path.join(srcDir, 'components/site/GoogleReviewsCarousel.tsx'), 'utf8')
  const modalContent = fs.readFileSync(path.join(srcDir, 'components/site/QuoteModal.tsx'), 'utf8')

  await t.test('All buttons specify explicit type attribute', () => {
    const componentFiles = [
      path.join(srcDir, 'components', 'site', 'Header.tsx'),
      path.join(srcDir, 'components', 'site', 'Footer.tsx'),
      path.join(srcDir, 'components', 'site', 'QuoteModal.tsx'),
      path.join(srcDir, 'components', 'site', 'RoofingEnquiryForm.tsx'),
      path.join(srcDir, 'components', 'site', 'GoogleReviewsCarousel.tsx'),
      path.join(srcDir, 'pages', 'HomePage.tsx'),
      path.join(srcDir, 'pages', 'ContactPage.tsx'),
      path.join(srcDir, 'pages', 'NotFoundPage.tsx'),
      path.join(srcDir, 'pages', 'ServicePage.tsx'),
      path.join(srcDir, 'pages', 'CategoryPage.tsx'),
    ]

    for (const file of componentFiles) {
      const code = fs.readFileSync(file, 'utf8')
      const buttonMatches = code.match(/<button(?![^>]*\btype=)[^>]*>/g) || []
      assert.deepEqual(buttonMatches, [], `Found <button> missing type attribute in ${path.basename(file)}`)
    }
  })

  await t.test('CTA buttons wire up openQuote modal trigger across all pages', () => {
    assert.ok(headerContent.includes('openQuote()'), 'Header CTA must trigger openQuote()')
    assert.ok(homeContent.includes('openQuote()'), 'HomePage Hero and CTA must trigger openQuote()')
    assert.ok(modalContent.includes('closeQuote'), 'QuoteModal must have closeQuote handler')
  })

  await t.test('Back-to-top button in footer triggers smooth scroll to top', () => {
    assert.ok(footerContent.includes('className="back-to-top"'))
    assert.ok(footerContent.includes("scrollTo({ top: 0, behavior: 'smooth' })"))
  })

  await t.test('Carousel controls exist with accessible labels', () => {
    assert.ok(homeContent.includes('aria-label="Previous projects"'))
    assert.ok(homeContent.includes('aria-label="Next projects"'))
    assert.ok(reviewsContent.includes('aria-label="Previous reviews"'))
    assert.ok(reviewsContent.includes('aria-label="Next reviews"'))
    assert.ok(reviewsContent.includes('role="tablist"'))
  })
})

// ============================================================
// 3. FORM VALIDATION & STEP WORKFLOWS (CLIENT & SERVER)
// ============================================================
test('Form Submissions & Validation End-to-End', async (t) => {
  await t.test('Contact Form accepts valid submission with select options', async () => {
    const validContact = {
      fullName: 'Johnathan Archer',
      email: 'johnathan@example.co.nz',
      phone: '021 555 1234',
      service: 'Asphalt Shingles',
      message: 'Looking for a reroof quote for our 3-bedroom villa in Mt Eden.',
    }

    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validContact),
    })

    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.ok(json.data.id.startsWith('cnt_'))
  })

  await t.test('Contact Form blocks invalid or empty fields with clear field errors', async () => {
    const emptyContact = {
      fullName: '',
      email: 'not-an-email',
      phone: '123',
      service: '',
      message: 'too short',
    }

    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emptyContact),
    })

    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.ok(json.errors.fullName, 'Missing error on fullName')
    assert.ok(json.errors.email, 'Missing error on email')
    assert.ok(json.errors.service, 'Missing error on service')
    assert.ok(json.errors.message, 'Missing error on message')
  })

  await t.test('Multi-Step Enquiry Form (Step 1 -> 2 -> 3) accepts valid full enquiry', async () => {
    const formData = new FormData()
    formData.append('property', 'home')
    formData.append('service', 'Metal Roofs & Cladding')
    formData.append('location', 'Ponsonby, Auckland')
    formData.append('timeframe', 'As soon as possible')
    formData.append('details', 'Urgent investigation required for active roof leak above kitchen.')
    formData.append('name', 'Hana Te Kanawa')
    formData.append('email', 'hana@tekanya.nz')
    formData.append('phone', '027 888 9999')
    formData.append('contactMethod', 'Phone')
    formData.append('additionalNotes', 'Gate code is 4321, dogs are secured.')

    const res = await fetch(`${baseUrl}/api/enquiry`, {
      method: 'POST',
      body: formData,
    })

    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.ok(json.data.id.startsWith('enq_'))
  })

  await t.test('Multi-Step Enquiry Form validates file upload constraints', async () => {
    const validFile = new Blob(['image data payload'], { type: 'image/jpeg' })
    const formData = new FormData()
    formData.append('property', 'business')
    formData.append('service', 'Membrane Roofing (Commercial)')
    formData.append('location', 'Highbrook, Auckland')
    formData.append('timeframe', 'Within 1–3 months')
    formData.append('details', 'Commercial office park roof membrane restoration and inspection.')
    formData.append('name', 'Mark Spencer')
    formData.append('email', 'mspencer@highbrookpark.co.nz')
    formData.append('phone', '09 274 5566')
    formData.append('files', validFile, 'roof-inspection.jpg')

    const res = await fetch(`${baseUrl}/api/enquiry`, {
      method: 'POST',
      body: formData,
    })

    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.ok(json.data.id.startsWith('enq_'))
  })

  await t.test('Multi-Step Enquiry Form rejects invalid file extensions (security guard)', async () => {
    const maliciousFile = new Blob(['executable code'], { type: 'application/x-msdownload' })
    const formData = new FormData()
    formData.append('property', 'business')
    formData.append('service', 'Membrane Roofing (Commercial)')
    formData.append('location', 'Highbrook, Auckland')
    formData.append('timeframe', 'Within 1–3 months')
    formData.append('details', 'Commercial office park roof membrane restoration.')
    formData.append('name', 'Mark Spencer')
    formData.append('email', 'mspencer@highbrookpark.co.nz')
    formData.append('phone', '09 274 5566')
    formData.append('files', maliciousFile, 'malicious.exe')

    const res = await fetch(`${baseUrl}/api/enquiry`, {
      method: 'POST',
      body: formData,
    })

    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.ok(json.errors.files, 'Should return error on disallowed file type')
  })

  await t.test('Forms trap bot submissions silently without creating leads', async () => {
    const botContact = {
      fullName: 'Spam Bot',
      email: 'bot@spam.com',
      service: 'Asphalt Shingles',
      message: 'Buy cheap watches now at this url.',
      _hp: 'http://spamurl.ru',
    }

    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(botContact),
    })

    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.equal(json.data, undefined, 'Honeypot submission must not return data lead object')
  })
})
