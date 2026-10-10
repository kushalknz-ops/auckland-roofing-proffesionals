/**
 * Auckland Roof Professionals - Node.js Production Server
 * Serves Vite static build (dist/), redirects HTTP to HTTPS, and supports reverse proxy headers.
 */

import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleApiRequest } from './server/api.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, 'dist')

const HTTP_PORT = Number(process.env.PORT || process.env.HTTP_PORT || 80)
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 443)
const SSL_KEY = process.env.SSL_KEY_PATH ? fs.readFileSync(process.env.SSL_KEY_PATH) : null
const SSL_CERT = process.env.SSL_CERT_PATH ? fs.readFileSync(process.env.SSL_CERT_PATH) : null

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

const CANONICAL_HOST = process.env.CANONICAL_HOST || 'aucklandroofprofessionals.nz'

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || `https://${CANONICAL_HOST},https://www.${CANONICAL_HOST}`)
  .split(',')
  .map((origin) => origin.trim().toLowerCase())
  .filter(Boolean)

const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://aucklandroofprofessionals.nz https://res.cloudinary.com",
  "media-src 'self' https://res.cloudinary.com blob:",
  "connect-src 'self' https://res.cloudinary.com https://fonts.googleapis.com https://fonts.gstatic.com",
  "frame-src 'self' https://www.google.com https://maps.google.com",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ')

const PERMISSIONS_POLICY = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'vr=()',
  'interest-cohort=()',
].join(', ')

function applySecurityAndCorsHeaders(req, res, isAsset) {
  // Security headers
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-XSS-Protection', '0')
  res.setHeader('Permissions-Policy', PERMISSIONS_POLICY)
  res.setHeader('Content-Security-Policy', CSP_POLICY)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')

  // CORS headers
  const origin = req.headers.origin
  if (isAsset) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  } else {
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    if (origin) {
      const originLower = origin.toLowerCase()
      const isAllowed =
        ALLOWED_ORIGINS.includes(originLower) ||
        originLower.startsWith('http://localhost:') ||
        originLower.startsWith('http://127.0.0.1:') ||
        originLower.startsWith('https://localhost:') ||
        originLower.startsWith('https://127.0.0.1:')

      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        res.setHeader('Access-Control-Max-Age', '86400')
        res.setHeader('Vary', 'Origin')
      }
    }
  }
}

function getCanonicalRedirect(req) {
  const hostHeader = req.headers.host || ''
  const host = hostHeader.split(':')[0].toLowerCase()

  // 1. Host canonicalization (www -> non-www in production)
  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(host)
  let targetHost = host
  let needsHostRedirect = false
  if (host.startsWith('www.')) {
    targetHost = host.slice(4)
    needsHostRedirect = true
  } else if (!isLocal && host !== CANONICAL_HOST && !host.endsWith('.local')) {
    targetHost = CANONICAL_HOST
    needsHostRedirect = true
  }

  // 2. Trailing slash canonicalization for subpaths (e.g. /commercial/ -> /commercial)
  const [urlPath, queryString] = (req.url || '/').split('?')
  let cleanPath = urlPath
  let needsPathRedirect = false
  if (urlPath.length > 1 && urlPath.endsWith('/') && !path.extname(urlPath)) {
    cleanPath = urlPath.replace(/\/+$/, '') || '/'
    needsPathRedirect = true
  }

  if (needsHostRedirect || needsPathRedirect) {
    const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(host)
    if (isLocal && !needsPathRedirect) return null

    const effectiveHost = isLocal ? host : targetHost
    const search = queryString ? `?${queryString}` : ''
    const proto = req.headers['x-forwarded-proto'] || (SSL_KEY ? 'https' : 'http')
    const port = isLocal && req.headers.host?.includes(':') ? `:${req.headers.host.split(':')[1]}` : ''
    return `${proto}://${effectiveHost}${port}${cleanPath}${search}`
  }

  return null
}

function handleStaticRequest(req, res) {
  const urlPath = req.url?.split('?')[0] || '/'
  const isAsset = urlPath.startsWith('/assets/')

  // Preflight request handling
  if (req.method === 'OPTIONS') {
    applySecurityAndCorsHeaders(req, res, isAsset)
    if (urlPath.startsWith('/api/')) {
      return handleApiRequest(req, res)
    }
    res.writeHead(204)
    res.end()
    return
  }

  // API endpoints
  if (urlPath.startsWith('/api/')) {
    applySecurityAndCorsHeaders(req, res, false)
    return handleApiRequest(req, res)
  }

  const redirectUrl = getCanonicalRedirect(req)
  if (redirectUrl) {
    applySecurityAndCorsHeaders(req, res, isAsset)
    res.writeHead(301, {
      Location: redirectUrl,
      'Content-Type': 'text/html; charset=utf-8',
    })
    res.end(`Redirecting to <a href="${redirectUrl}">${redirectUrl}</a>`)
    return
  }

  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath)

  // SPA fallback: If requested file does not exist, serve index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html')
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  // Apply Security and CORS headers
  applySecurityAndCorsHeaders(req, res, isAsset)
  res.setHeader('Content-Type', contentType)

  if (urlPath.startsWith('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }

  fs.createReadStream(filePath).pipe(res)
}

export function createRequestHandler() {
  return (req, res) => {
    const forwardedProto = req.headers['x-forwarded-proto']
    const isHttps = forwardedProto === 'https'
    const rawHost = req.headers.host ? req.headers.host.split(':')[0] : 'localhost'
    const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(rawHost)
    const rawPath = (req.url || '').split('?')[0]

    // Preflight request handling
    if (req.method === 'OPTIONS') {
      const isAsset = rawPath.startsWith('/assets/')
      applySecurityAndCorsHeaders(req, res, isAsset)
      if (rawPath.startsWith('/api/')) {
        return handleApiRequest(req, res)
      }
      res.writeHead(204)
      res.end()
      return
    }

    // Handle API endpoints directly on HTTP if no SSL or local
    if (rawPath.startsWith('/api/')) {
      applySecurityAndCorsHeaders(req, res, false)
      return handleApiRequest(req, res)
    }

    // Behind reverse proxy with SSL termination or local environment without SSL: serve static assets directly
    if (!SSL_KEY && (isHttps || isLocal)) {
      handleStaticRequest(req, res)
      return
    }

    // Otherwise redirect HTTP -> HTTPS with canonical host & clean path
    const host = isLocal ? rawHost : (rawHost.startsWith('www.') ? rawHost.slice(4) : rawHost)
    const portSuffix = isLocal && HTTPS_PORT !== 443 ? `:${HTTPS_PORT}` : ''

    const rawQuery = (req.url || '').split('?')[1] || ''
    const cleanPath = rawPath.length > 1 && rawPath.endsWith('/') && !path.extname(rawPath)
      ? rawPath.replace(/\/+$/, '')
      : rawPath
    const search = rawQuery ? `?${rawQuery}` : ''
    const targetUrl = `https://${host}${portSuffix}${cleanPath}${search}`

    res.writeHead(301, {
      Location: targetUrl,
      'Content-Type': 'text/html; charset=utf-8',
    })
    res.end(`Redirecting to <a href="${targetUrl}">${targetUrl}</a>`)
  }
}

// 1. Direct or Reverse-Proxy HTTP Redirect Handler
export function createHttpRedirectServer(port = HTTP_PORT) {
  const server = http.createServer(createRequestHandler())

  if (port) {
    server.listen(port, () => {
      console.log(`[HTTP Server] Listening on port ${port} (Redirects traffic to HTTPS)`)
    })
  }

  return server
}

// 2. HTTPS Server (if SSL certs provided)
export function createHttpsServer(port = HTTPS_PORT) {
  if (SSL_KEY && SSL_CERT) {
    const server = https.createServer({ key: SSL_KEY, cert: SSL_CERT }, (req, res) => {
      handleStaticRequest(req, res)
    })
    if (port) {
      server.listen(port, () => {
        console.log(`[HTTPS Server] Listening on secure port ${port}`)
      })
    }
    return server
  }
  return null
}

export {
  applySecurityAndCorsHeaders,
  getCanonicalRedirect,
  handleStaticRequest,
  CSP_POLICY,
  PERMISSIONS_POLICY,
  ALLOWED_ORIGINS,
  CANONICAL_HOST,
}

const isDirectRun = Boolean(process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
if (isDirectRun) {
  createHttpRedirectServer()
  createHttpsServer()
}
