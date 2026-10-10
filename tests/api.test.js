/**
 * Integration tests for /api/contact and /api/enquiry endpoints
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { handleApiRequest } from '../server/api.js'

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

test('API endpoints integration', async (t) => {
  await t.test('OPTIONS preflight request returns 204 with CORS headers', async () => {
    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://aucklandroofprofessionals.nz' },
    })
    assert.equal(res.status, 204)
    assert.ok(res.headers.get('access-control-allow-methods')?.includes('POST'))
  })

  await t.test('GET method returns 405 Method Not Allowed', async () => {
    const res = await fetch(`${baseUrl}/api/contact`, { method: 'GET' })
    assert.equal(res.status, 405)
    const json = await res.json()
    assert.equal(json.success, false)
  })

  await t.test('POST /api/contact with valid JSON returns 200 and receipt ID', async () => {
    const payload = {
      fullName: 'Aroha Smith',
      email: 'aroha.smith@example.co.nz',
      phone: '021 987 6543',
      service: 'Membrane Roofing (Residential)',
      message: 'Need an inspection on flat roof membrane after heavy storm.',
    }

    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.ok(json.data?.id?.startsWith('cnt_'))
  })

  await t.test('POST /api/contact with invalid data returns 400 with field errors', async () => {
    const payload = {
      fullName: '',
      email: 'invalid-email',
      service: '',
      message: 'short',
    }

    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.ok(json.errors.fullName)
    assert.ok(json.errors.email)
    assert.ok(json.errors.service)
    assert.ok(json.errors.message)
  })

  await t.test('POST /api/contact with malformed JSON returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"invalid": json',
    })

    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.match(json.message, /Invalid JSON/)
  })

  await t.test('POST /api/enquiry with FormData returns 200', async () => {
    const formData = new FormData()
    formData.append('property', 'business')
    formData.append('service', 'Metal Roofs & Cladding')
    formData.append('location', 'Albany, Auckland')
    formData.append('timeframe', 'Within 1–3 months')
    formData.append('details', 'Commercial warehouse reroofing project for 850sqm industrial facility.')
    formData.append('name', 'Liam Johnson')
    formData.append('email', 'liam@warehousegroup.co.nz')
    formData.append('phone', '09 444 8899')
    formData.append('contactMethod', 'Email')

    const res = await fetch(`${baseUrl}/api/enquiry`, {
      method: 'POST',
      body: formData,
    })

    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.ok(json.data?.id?.startsWith('enq_'))
  })

  await t.test('POST /api/enquiry with invalid fields returns 400 with errors', async () => {
    const formData = new FormData()
    formData.append('property', 'home')
    // missing service, location, details, name, email, phone

    const res = await fetch(`${baseUrl}/api/enquiry`, {
      method: 'POST',
      body: formData,
    })

    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.ok(json.errors.service)
    assert.ok(json.errors.location)
    assert.ok(json.errors.name)
  })
})
