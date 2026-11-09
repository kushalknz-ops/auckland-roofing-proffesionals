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

function rawRequest(path, options = {}, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(baseUrl, { ...options, path }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString(), headers: res.headers }))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end(body)
  })
}

test('blocks file traversal, private filenames and browser source maps', async () => {
  for (const url of ['/../package.json', '/%2e%2e/package.json', '/%2eenv.local', '/..\\package.json', '/assets/app.js.map']) {
    assert.equal((await rawRequest(url)).status, 404)
  }
})

test('ignores untrusted protocol headers and keeps redirects on the canonical host', async () => {
  const response = await rawRequest('/contact?next=<sample>', {
    method: 'POST',
    headers: { Host: 'example.invalid', 'X-Forwarded-Proto': 'https' },
  })
  assert.equal(response.status, 307)
  assert.equal(response.headers['content-security-policy'], CSP_POLICY)
  assert.equal(new URL(response.headers.location).hostname, 'aucklandroofprofessionals.nz')
  assert.equal(response.body, '')
})

test('blocks unauthorized browser origins and never reflects the requested API path', async () => {
  const denied = await rawRequest('/api/contact', { method: 'POST', headers: { Origin: 'https://example.invalid' } })
  assert.equal(denied.status, 403)
  assert.equal(denied.headers['cache-control'], 'no-store')
  const unknown = await rawRequest('/api/synthetic-request-marker', { method: 'POST' })
  assert.equal(unknown.status, 404)
  assert.equal(unknown.body.includes('synthetic-request-marker'), false)
})

test('enforces the streamed JSON limit without a Content-Length header', async () => {
  resetRateLimits()
  const response = await rawRequest('/api/contact', {
    method: 'POST',
    headers: { 'Transfer-Encoding': 'chunked', 'Content-Type': 'application/json' },
  }, Buffer.alloc(1024 * 1024 + 1, 32))
  assert.equal(response.status, 413)
  resetRateLimits()
})

test('applies security headers to documents, assets, API errors and redirects', async () => {
  for (const route of ['/', '/assets/og-image.jpg', '/404.html', '/blog/unknown', '/%invalid', '/api/contact', '/contact/']) {
    const { headers } = await rawRequest(route)
    assert.equal(headers['strict-transport-security'], undefined, route)
    assert.equal(headers['x-content-type-options'], 'nosniff', route)
    assert.equal(headers['x-frame-options'], 'DENY', route)
    assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin', route)
    assert.equal(headers['cross-origin-opener-policy'], 'same-origin', route)
    assert.equal(headers['permissions-policy'], PERMISSIONS_POLICY, route)
    assert.equal(headers['content-security-policy'], CSP_POLICY.replace('; upgrade-insecure-requests', ''), route)
    assert.equal(headers['x-powered-by'], undefined, route)
    assert.doesNotMatch(headers['content-security-policy'], /unsafe-inline|unsafe-eval/)
  }
})

test('rejects untrusted preflights and keeps static assets same-origin for fetches', async () => {
  const headers = {
    Origin: 'https://untrusted.example',
    'Access-Control-Request-Method': 'POST',
  }
  for (const [route, status] of [['/api/contact', 403], ['/assets/og-image.jpg', 405]]) {
    const result = await rawRequest(route, { method: 'OPTIONS', headers })
    assert.equal(result.status, status)
    assert.equal(result.headers['access-control-allow-origin'], undefined)
    assert.equal(result.headers['access-control-allow-methods'], undefined)
  }
  const result = await rawRequest('/assets/og-image.jpg', { headers })
  assert.equal(result.status, 200)
  assert.equal(result.headers['access-control-allow-origin'], undefined)
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

  await t.test('ignores forged forwarding headers on direct connections', async () => {
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

    assert.equal(res.status, 429)
  })
  resetRateLimits()
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
    assert.equal(redirect, 'https://aucklandroofprofessionals.nz/contact')
  })

  await t.test('getCanonicalRedirect preserves query parameters', () => {
    const req = {
      headers: { host: 'www.aucklandroofprofessionals.nz' },
      url: '/service/?id=metal-roofing',
    }
    const redirect = getCanonicalRedirect(req)
    assert.ok(redirect)
    assert.equal(redirect, 'https://aucklandroofprofessionals.nz/service?id=metal-roofing')
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
  await t.test('unknown SPA routes serve the React error page with HTTP 404 and noindex', async () => {
    const res = await fetch(`${baseUrl}/nonexistent-page-url`, {
      headers: { 'X-Forwarded-For': '198.51.100.140' },
    })
    assert.equal(res.status, 404)
    assert.equal(res.headers.get('x-robots-tag'), 'noindex')
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
    assert.match(body, /0800 766 311/)
  })
})

