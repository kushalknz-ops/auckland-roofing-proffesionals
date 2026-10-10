/**
 * API Router & Request Handler
 * Auckland Roof Professionals
 */

import {
  validateContactSubmission,
  validateEnquirySubmission,
} from './validation.js'

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
 * Extracts client IP from request
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || '127.0.0.1'
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

  if (contentLength > maxBytes) {
    const err = new Error('PAYLOAD_TOO_LARGE')
    err.code = 'PAYLOAD_TOO_LARGE'
    throw err
  }

  // Create standard Web Request from Node req stream
  const url = `http://${req.headers.host || 'localhost'}${req.url}`
  const webRequest = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: req,
    duplex: 'half',
  })

  if (contentType.includes('multipart/form-data')) {
    const formData = await webRequest.formData()
    const fields = {}
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
    const rawText = await webRequest.text()
    if (!rawText.trim()) return { body: {}, files: [] }
    try {
      const parsed = JSON.parse(rawText)
      return { body: parsed, files: parsed.files || [] }
    } catch {
      const err = new Error('INVALID_JSON')
      err.code = 'INVALID_JSON'
      throw err
    }
  }

  // Fallback / URL-encoded
  const text = await webRequest.text()
  const params = new URLSearchParams(text)
  const fields = Object.fromEntries(params.entries())
  return { body: fields, files: [] }
}

const CANONICAL_HOST = process.env.CANONICAL_HOST || 'aucklandroofprofessionals.nz'
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || `https://${CANONICAL_HOST},https://www.${CANONICAL_HOST}`)
  .split(',')
  .map((origin) => origin.trim().toLowerCase())
  .filter(Boolean)

function isAllowedOrigin(origin) {
  if (!origin) return false
  const originLower = origin.toLowerCase()
  return (
    ALLOWED_ORIGINS.includes(originLower) ||
    originLower.startsWith('http://localhost:') ||
    originLower.startsWith('http://127.0.0.1:') ||
    originLower.startsWith('https://localhost:') ||
    originLower.startsWith('https://127.0.0.1:')
  )
}

/**
 * Main API request handler
 */
export async function handleApiRequest(req, res) {
  const rawPath = (req.url || '').split('?')[0]
  const cleanPath = rawPath.replace(/\/+$/, '')

  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin
    const corsHeaders = {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    }
    if (origin && isAllowedOrigin(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin
      corsHeaders['Vary'] = 'Origin'
    }
    res.writeHead(204, corsHeaders)
    res.end()
    return true
  }

  // 2. Only POST method is allowed on API endpoints
  if (req.method !== 'POST') {
    sendJson(res, 405, {
      success: false,
      message: `Method ${req.method} not allowed. Please use POST.`,
    }, {
      Allow: 'POST, OPTIONS',
    })
    return true
  }

  // 3. Rate limiting check
  const clientIp = getClientIp(req)
  if (isRateLimited(clientIp)) {
    sendJson(res, 429, {
      success: false,
      message: 'Too many requests. Please wait a few moments before trying again or call us at 0800 555 766.',
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
      })
      return true
    }
    if (err.code === 'INVALID_JSON') {
      sendJson(res, 400, {
        success: false,
        message: 'Invalid JSON payload received in request.',
      })
      return true
    }
    sendJson(res, 500, {
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

  if (cleanPath === '/api/enquiry' || cleanPath === '/api/quote') {
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

  // 404 for unknown /api/* endpoints
  sendJson(res, 404, {
    success: false,
    message: `API endpoint '${cleanPath}' not found.`,
  })
  return true
}

export function resetRateLimits() {
  rateLimitStore.clear()
}

export { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS }
