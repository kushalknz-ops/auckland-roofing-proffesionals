/**
 * API Router & Request Handler
 * Auckland Roof Professionals
 */

import {
  validateContactSubmission,
  validateEnquirySubmission,
} from './validation.js'
import { getClientIp, isSecureRequest } from './config.js'

const submissionPaths = new Set(['/api/contact', '/api/enquiry', '/api/quote'])
const submissionMethods = 'POST, OPTIONS'

// In-memory sliding window rate limiter
// IP -> Array of timestamps
const rateLimitStore = new Map()
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = 15 // max submissions per 5 mins per IP

// Clear expired rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, timestamps] of rateLimitStore.entries()) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
    if (valid.length === 0) {
      rateLimitStore.delete(ip)
    } else {
      rateLimitStore.set(ip, valid)
    }
  }
}, 60 * 1000).unref?.()

/**
 * Checks if client IP is rate limited
 */
function isRateLimited(ip) {
  const now = Date.now()
  const timestamps = (rateLimitStore.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  )

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true
  }

  timestamps.push(now)
  rateLimitStore.set(ip, timestamps)
  return false
}

/**
 * Sends a structured JSON response
 */
function sendJson(res, statusCode, body, extraHeaders = {}) {
  const payload = JSON.stringify(body)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  })
  res.end(payload)
}

/**
 * Parses request body based on Content-Type
 * Supports application/json and multipart/form-data
 */
async function parseRequestBody(req) {
  const contentType = (req.headers['content-type'] || '').toLowerCase()
  const contentLength = Number(req.headers['content-length'] || 0)

  // Maximum allowed sizes: 1MB for json, 15MB for multipart
  const maxBytes = contentType.includes('multipart/form-data')
    ? 15 * 1024 * 1024
    : 1024 * 1024

  const tooLarge = () => Object.assign(new Error('Payload too large'), { code: 'PAYLOAD_TOO_LARGE' })
  if (contentLength > maxBytes) throw tooLarge()

  const chunks = []
  let bytes = 0
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length
    if (bytes > maxBytes) throw tooLarge()
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks, bytes)

  if (contentType.includes('multipart/form-data')) {
    const formData = await new Response(raw, { headers: { 'Content-Type': req.headers['content-type'] } }).formData()
    const fields = Object.create(null)
    const files = []

    for (const [key, value] of formData.entries()) {
      if (typeof value === 'object' && value !== null && 'name' in value) {
        // Web File object
        files.push(value)
      } else {
        fields[key] = value
      }
    }

    return { body: fields, files }
  }

  if (contentType.includes('application/json') || contentType === '') {
    const rawText = raw.toString('utf8')
    if (!rawText.trim()) return { body: {}, files: [] }
    try {
      const parsed = JSON.parse(rawText)
      return { body: parsed, files: parsed?.files || [] }
    } catch {
      const err = new Error('INVALID_JSON')
      err.code = 'INVALID_JSON'
      throw err
    }
  }

  // Fallback / URL-encoded
  const params = new URLSearchParams(raw.toString('utf8'))
  const fields = Object.fromEntries(params.entries())
  return { body: fields, files: [] }
}

/**
 * Main API request handler
 */
export async function handleApiRequest(req, res, allowedOrigins) {
  const rawPath = (req.url || '').split('?')[0]
  const cleanPath = rawPath.replace(/\/+$/, '')
  const origin = req.headers.origin
  const host = req.headers.host
  const sameOrigin = host && origin === `${isSecureRequest(req) ? 'https' : 'http'}://${host}`
  const allowedCrossOrigin = !sameOrigin && allowedOrigins?.has(origin)
  const originDenied = origin === undefined
    ? ['same-site', 'cross-site'].includes(req.headers['sec-fetch-site'])
    : !sameOrigin && !allowedCrossOrigin
  res.setHeader('Vary', 'Origin')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')

  if (req.method === 'OPTIONS') {
    res.setHeader('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers')
    const method = req.headers['access-control-request-method']
    const headers = req.headers['access-control-request-headers']
    const isPreflight = method !== undefined || headers !== undefined
    if (originDenied || (isPreflight && (!origin || method !== 'POST' ||
        (headers !== undefined && !/^content-type$/i.test(headers.trim()))))) {
      sendJson(res, 403, { success: false, message: 'This preflight request is not allowed.' })
      return true
    }
    if (!submissionPaths.has(cleanPath)) {
      sendJson(res, 404, { success: false, message: 'API endpoint not found.' })
      return true
    }
    if (isPreflight && allowedCrossOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Methods', 'POST')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      res.setHeader('Access-Control-Max-Age', '600')
    }
    res.writeHead(204, { Allow: submissionMethods }).end()
    return true
  }

  // 2. Only POST method is allowed on API endpoints
  if (req.method !== 'POST') {
    sendJson(res, 405, {
      success: false,
      message: `Method ${req.method} not allowed. Please use POST.`,
    }, {
      Allow: submissionMethods,
    })
    return true
  }

  if (originDenied) {
    sendJson(res, 403, { success: false, message: 'This request origin is not allowed.' })
    return true
  }

  if (!submissionPaths.has(cleanPath)) {
    sendJson(res, 404, { success: false, message: 'API endpoint not found.' })
    return true
  }
  if (allowedCrossOrigin) res.setHeader('Access-Control-Allow-Origin', origin)

  // 3. Rate limiting check
  const clientIp = getClientIp(req)
  if (isRateLimited(clientIp)) {
    sendJson(res, 429, {
      success: false,
      message: 'Too many requests. Please wait a few moments before trying again or call us at 0800 766 311.',
    }, {
      'Retry-After': '60',
    })
    return true
  }

  // 4. Parse request payload
  let payload
  try {
    payload = await parseRequestBody(req)
  } catch (err) {
    if (err.code === 'PAYLOAD_TOO_LARGE') {
      sendJson(res, 413, {
        success: false,
        message: 'Payload too large. Attached files or data exceed the maximum limit.',
      }, { Connection: 'close' })
      return true
    }
    if (err.code === 'INVALID_JSON') {
      sendJson(res, 400, {
        success: false,
        message: 'Invalid JSON payload received in request.',
      })
      return true
    }
    sendJson(res, 400, {
      success: false,
      message: 'Failed to process request data.',
    })
    return true
  }

  const { body, files } = payload

  // 5. Route handlers
  if (cleanPath === '/api/contact') {
    const result = validateContactSubmission(body)

    if (result.isBot) {
      // Quietly return success to bots
      sendJson(res, 200, {
        success: true,
        message: 'Your message has been received.',
      })
      return true
    }

    if (!result.isValid) {
      sendJson(res, 400, {
        success: false,
        message: 'Please correct the validation errors below.',
        errors: result.errors,
      })
      return true
    }

    // Success response
    const submissionId = `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    sendJson(res, 200, {
      success: true,
      message: 'Thank you for reaching out. We have received your message and our team will get in touch shortly.',
      data: {
        id: submissionId,
        receivedAt: new Date().toISOString(),
      },
    })
    return true
  }

  const result = validateEnquirySubmission(body, files)

  if (result.isBot) {
    sendJson(res, 200, {
      success: true,
      message: 'Your enquiry has been received.',
    })
    return true
  }

  if (!result.isValid) {
    sendJson(res, 400, {
      success: false,
      message: 'Please correct the validation errors in your enquiry.',
      errors: result.errors,
    })
    return true
  }

  const submissionId = `enq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  sendJson(res, 200, {
    success: true,
    message: 'Your enquiry has been received. Our roofing team will be in touch with you shortly.',
    data: {
      id: submissionId,
      receivedAt: new Date().toISOString(),
    },
  })
  return true
}

export function resetRateLimits() {
  rateLimitStore.clear()
}

export { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS }
