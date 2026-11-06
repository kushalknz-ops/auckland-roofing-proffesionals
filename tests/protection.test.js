/**
 * Route Protection & Security Guard Integration Tests
 * Auckland Roof Professionals
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {
  createRequestHandler,
  getCanonicalRedirect,
  CSP_POLICY,
  PERMISSIONS_POLICY,
} from '../server.js'
import { resetRateLimits, RATE_LIMIT_MAX_REQUESTS } from '../server/api.js'

let server
let baseUrl

test.before(async () => {
  resetRateLimits()
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
  resetRateLimits()
  await new Promise((resolve) => server.close(resolve))
})

test('Protected Routes - Security Headers & Policies', async (t) => {
  await t.test('enforces all production security headers on API routes', async () => {
    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://aucklandroofprofessionals.nz' },
    })

    assert.equal(res.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains; preload')
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN')
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
    assert.equal(res.headers.get('x-xss-protection'), '0')
    assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin')
    assert.equal(res.headers.get('permissions-policy'), PERMISSIONS_POLICY)
    assert.equal(res.headers.get('content-security-policy'), CSP_POLICY)
  })

  await t.test('restricts CORS origin to allowed domains on API endpoints', async () => {
    // 1. Untrusted origin should NOT receive Access-Control-Allow-Origin
    const untrustedRes = await fetch(`${baseUrl}/api/contact`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://malicious-attacker.com' },
    })
    assert.notEqual(untrustedRes.headers.get('access-control-allow-origin'), 'https://malicious-attacker.com')

    // 2. Trusted production origin receives Access-Control-Allow-Origin
    const trustedRes = await fetch(`${baseUrl}/api/contact`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://aucklandroofprofessionals.nz' },
    })
    assert.equal(trustedRes.headers.get('access-control-allow-origin'), 'https://aucklandroofprofessionals.nz')
    assert.ok(trustedRes.headers.get('vary')?.includes('Origin'))
  })

  await t.test('permits open CORS and cross-origin resource policy on /assets/ paths', async () => {
    const res = await fetch(`${baseUrl}/assets/logo.png`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://anywhere.org' },
    })

    assert.equal(res.headers.get('access-control-allow-origin'), '*')
    assert.equal(res.headers.get('cross-origin-resource-policy'), 'cross-origin')
  })
})

test('Protected Routes - Rate Limiting Defense (HTTP 429)', async (t) => {
  const testIp = '198.51.100.99'
  resetRateLimits()

  await t.test(`permits up to ${RATE_LIMIT_MAX_REQUESTS} requests from a single client IP`, async () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      const res = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testIp,
        },
        body: JSON.stringify({ fullName: '' }), // Invalid data, but should still count and not be 429
      })
      assert.notEqual(res.status, 429, `Request ${i + 1} was prematurely rate limited`)
    }
  })

  await t.test('blocks subsequent requests with HTTP 429 and Retry-After header', async () => {
    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': testIp,
      },
      body: JSON.stringify({
        fullName: 'Jane Doe',
        email: 'jane@example.co.nz',
        phone: '021 123 4567',
        service: 'Metal Roofs & Cladding',
        message: 'This request should be blocked by rate limit.',
      }),
    })

    assert.equal(res.status, 429)
    assert.equal(res.headers.get('retry-after'), '60')
    const json = await res.json()
    assert.equal(json.success, false)
    assert.match(json.message, /Too many requests/i)
  })

  await t.test('isolates rate limits per client IP (different IP is unaffected)', async () => {
    const differentIp = '198.51.100.100'
    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': differentIp,
      },
      body: JSON.stringify({
        fullName: 'Aroha Smith',
        email: 'aroha@example.co.nz',
        phone: '021 987 6543',
        service: 'Membrane Roofing (Residential)',
        message: 'Inspection requested for residential flat roof.',
      }),
    })

    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.ok(json.data?.id?.startsWith('cnt_'))
  })
})

test('Protected Routes - Payload Size Guard (HTTP 413)', async (t) => {
  await t.test('blocks oversized JSON requests exceeding 1 MB with HTTP 413', async () => {
    // Create an oversized body (> 1MB)
    const largeMessage = 'x'.repeat(1024 * 1024 + 1024)
    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.105',
      },
      body: JSON.stringify({
        fullName: 'Large Sender',
        email: 'large@example.com',
        phone: '021 555 1234',
        service: 'Metal Roofs & Cladding',
        message: largeMessage,
      }),
    })

    assert.equal(res.status, 413)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.match(json.message, /Payload too large/i)
  })

  await t.test('accepts valid normal payload under 1 MB', async () => {
    const normalRes = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.106',
      },
      body: JSON.stringify({
        fullName: 'Normal Sender',
        email: 'normal@example.co.nz',
        phone: '021 555 1234',
        service: 'Metal Roofs & Cladding',
        message: 'This is a normal sized quote enquiry under limit.',
      }),
    })

    assert.equal(normalRes.status, 200)
    const json = await normalRes.json()
    assert.equal(json.success, true)
  })
})

test('Protected Routes - HTTP Method Guards (HTTP 405)', async (t) => {
  const disallowedMethods = ['GET', 'PUT', 'DELETE', 'PATCH']

  for (const method of disallowedMethods) {
    await t.test(`rejects ${method} /api/contact with HTTP 405 and Allow header`, async () => {
      const res = await fetch(`${baseUrl}/api/contact`, {
        method,
        headers: { 'X-Forwarded-For': '198.51.100.110' },
      })
      assert.equal(res.status, 405)
      assert.equal(res.headers.get('allow'), 'POST, OPTIONS')
      const json = await res.json()
      assert.equal(json.success, false)
      assert.match(json.message, new RegExp(`Method ${method} not allowed`, 'i'))
    })
  }

  await t.test('rejects GET /api/enquiry with HTTP 405 and Allow header', async () => {
    const res = await fetch(`${baseUrl}/api/enquiry`, {
      method: 'GET',
      headers: { 'X-Forwarded-For': '198.51.100.111' },
    })
    assert.equal(res.status, 405)
    assert.equal(res.headers.get('allow'), 'POST, OPTIONS')
  })
})

test('Protected Routes - Bot Honeypot Trapping', async (t) => {
  await t.test('traps bot spam on /api/contact with silent 200 without creating lead ID', async () => {
    const botRes = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.120',
      },
      body: JSON.stringify({
        fullName: 'Spam Bot',
        email: 'spammer@bot.org',
        phone: '021 000 0000',
        service: 'Metal Roofs & Cladding',
        message: 'Buy cheap pills here!',
        _hp: 'automated-bot-content', // Honeypot field filled
      }),
    })

    assert.equal(botRes.status, 200)
    const json = await botRes.json()
    assert.equal(json.success, true)
    assert.equal(json.data, undefined, 'Bot submission must NOT generate or return a lead ID')
  })

  await t.test('traps bot spam on /api/enquiry with silent 200 without creating lead ID', async () => {
    const formData = new FormData()
    formData.append('name', 'Spam Bot')
    formData.append('email', 'spam@bot.org')
    formData.append('phone', '021 111 2222')
    formData.append('service', 'Metal Roofs & Cladding')
    formData.append('location', 'Auckland CBD')
    formData.append('details', 'Spam enquiry message')
    formData.append('_hp', 'bot-trap-triggered')

    const botRes = await fetch(`${baseUrl}/api/enquiry`, {
      method: 'POST',
      headers: { 'X-Forwarded-For': '198.51.100.121' },
      body: formData,
    })

    assert.equal(botRes.status, 200)
    const json = await botRes.json()
    assert.equal(json.success, true)
    assert.equal(json.data, undefined, 'Bot submission must NOT generate or return a lead ID')
  })
})

test('Protected Routes - Unknown Endpoint Guard (HTTP 404)', async (t) => {
  await t.test('returns HTTP 404 for nonexistent API routes', async () => {
    const endpoints = ['/api/admin', '/api/users', '/api/secret', '/api/v1/private']

    for (const endpoint of endpoints) {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.130',
        },
        body: JSON.stringify({ action: 'inspect' }),
      })

      assert.equal(res.status, 404)
      const json = await res.json()
      assert.equal(json.success, false)
      assert.match(json.message, /not found/i)
    }
  })
})

test('Protected Routes - Canonical Host and URL Redirection', async (t) => {
  await t.test('getCanonicalRedirect strips trailing slashes on subpaths', () => {
    const req = {
      headers: { host: 'aucklandroofprofessionals.nz' },
      url: '/commercial/',
    }
    const redirect = getCanonicalRedirect(req)
    assert.ok(redirect)
    assert.match(redirect, /aucklandroofprofessionals\.nz\/commercial$/)
  })

  await t.test('getCanonicalRedirect normalizes www host to apex canonical host', () => {
    const req = {
      headers: { host: 'www.aucklandroofprofessionals.nz' },
      url: '/contact',
    }
    const redirect = getCanonicalRedirect(req)
    assert.ok(redirect)
    assert.equal(redirect, 'http://aucklandroofprofessionals.nz/contact')
  })

  await t.test('getCanonicalRedirect preserves query parameters', () => {
    const req = {
      headers: { host: 'www.aucklandroofprofessionals.nz' },
      url: '/service/?id=metal-roofing',
    }
    const redirect = getCanonicalRedirect(req)
    assert.ok(redirect)
    assert.equal(redirect, 'http://aucklandroofprofessionals.nz/service?id=metal-roofing')
  })

  await t.test('getCanonicalRedirect leaves clean apex URLs unchanged', () => {
    const req = {
      headers: { host: 'aucklandroofprofessionals.nz' },
      url: '/commercial',
    }
    const redirect = getCanonicalRedirect(req)
      assert.equal(redirect, null)
  })
})

test('Custom 404 Page & Fallback Handling', async (t) => {
  await t.test('SPA serves HTML for unknown route paths so custom React 404 renders', async () => {
    const res = await fetch(`${baseUrl}/nonexistent-page-url`, {
      headers: { 'X-Forwarded-For': '198.51.100.140' },
    })
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') || '', /text\/html/)
    const body = await res.text()
    assert.match(body, /<div id="root">/)
  })

  await t.test('standalone 404.html static fallback is generated and branded', async () => {
    const res = await fetch(`${baseUrl}/404.html`, {
      headers: { 'X-Forwarded-For': '198.51.100.141' },
    })
    assert.equal(res.status, 200)
    const body = await res.text()
    assert.match(body, /404 - Page Not Found/i)
    assert.match(body, /Auckland Roof Professionals/i)
    assert.match(body, /0800 555 766/)
  })
})

