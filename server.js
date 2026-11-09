/**
 * Auckland Roof Professionals - Node.js Production Server
 * Serves Vite static build (dist/), redirects HTTP to HTTPS, and supports reverse proxy headers.
 */

import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { pipeline } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { isServiceAlias, serviceRedirectPath } from './server/service-pages.js'
import { normalizePagePath } from './src/lib/site-url.ts'
import { CSP_POLICY, HSTS_POLICY, PERMISSIONS_POLICY, SECURITY_HEADERS } from './server/security.js'
import { installProcessMonitoring, logListening, observeNodeRequest, receiveNodeTelemetry, reportStreamFailure } from './server/node-monitoring.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDirectRun = Boolean(process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
const runningServers = []
if (isDirectRun) installProcessMonitoring(() => {
  for (const server of runningServers) server.close()
})
const { CANONICAL_HOST, isSecureRequest, readAllowedOrigins, readPort } = await import('./server/config.js')
const { handleApiRequest } = await import('./server/api.js')
const DIST_DIR = path.resolve(__dirname, 'dist')
const development = process.env.NODE_ENV === 'development'
const ALLOWED_ORIGINS = readAllowedOrigins(
  development ? process.env.DEV_ALLOWED_ORIGINS : process.env.ALLOWED_ORIGINS,
  development,
)

const HTTP_PORT = readPort('PORT', process.env.PORT, readPort('HTTP_PORT', process.env.HTTP_PORT, 80))
const HTTPS_PORT = readPort('HTTPS_PORT', process.env.HTTPS_PORT, 443)
const { SSL_KEY_PATH, SSL_CERT_PATH } = process.env
if (Boolean(SSL_KEY_PATH) !== Boolean(SSL_CERT_PATH)) {
  throw new Error('SSL_KEY_PATH and SSL_CERT_PATH must be configured together.')
}
let tlsOptions
if (SSL_KEY_PATH && SSL_CERT_PATH) {
  try {
    tlsOptions = { key: fs.readFileSync(SSL_KEY_PATH), cert: fs.readFileSync(SSL_CERT_PATH) }
  } catch {
    throw new Error('Unable to read the configured TLS files.')
  }
}

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
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

function isLocalRequest(req) {
  const host = req.headers.host?.split(':')[0] || 'localhost'
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(host) &&
    ['127.0.0.1', '::ffff:127.0.0.1', '::1'].includes(req.socket?.remoteAddress)
}

function applySecurityHeaders(req, res) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value)
  if (isSecureRequest(req)) {
    res.setHeader('Strict-Transport-Security', HSTS_POLICY)
  } else if (isLocalRequest(req)) {
    // WebKit upgrades same-origin asset URLs even on an HTTP loopback preview.
    res.setHeader('Content-Security-Policy', CSP_POLICY.replace('; upgrade-insecure-requests', ''))
  }
}

function pageFileFor(pathname) {
  if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(pathname)) return null
  return path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname === '/404' ? '404-app.html' : `${pathname}.html`)
}

function getCanonicalRedirect(req, forceHttps = false) {
  const hostHeader = req.headers.host || ''
  const host = hostHeader.split(':')[0].toLowerCase()
  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(host)
  const requestTarget = req.url || '/'
  const urlPath = requestTarget.split('?', 1)[0]
  const search = requestTarget.slice(urlPath.length)
  const clean = normalizePagePath(urlPath)
  let target = requestTarget.startsWith('/') ? requestTarget : '/'
  if (req.method === 'GET' || req.method === 'HEAD' || !req.method) {
    if (isServiceAlias(clean)) {
      target = serviceRedirectPath(new URLSearchParams(search)) ?? clean + search
    } else if (clean !== urlPath) {
      const page = pageFileFor(clean)
      if (page && fs.existsSync(page)) target = clean + search
    }
  }

  if (!forceHttps && (isLocal || host === CANONICAL_HOST) && target === requestTarget) return null
  if (isLocal && !forceHttps) {
    // Absolute paths beginning with two slashes are interpreted as a new host.
    return target.startsWith('//') ? null : target
  }
  const authority = isLocal && HTTPS_PORT !== 443 ? `${host}:${HTTPS_PORT}` : isLocal ? host : CANONICAL_HOST
  return `https://${authority}${target}`
}

function handleStaticRequest(req, res) {
  const urlPath = req.url?.split('?')[0] || '/'
  applySecurityHeaders(req, res)
  let decodedPath
  try {
    decodedPath = decodeURIComponent(urlPath)
  } catch {
    res.writeHead(400).end()
    return
  }
  if (!decodedPath.startsWith('/') || /[\\:\u0000-\u001f\u007f]/.test(decodedPath) ||
      /(?:^|\/)\./.test(decodedPath) || /\.(?:map|pem|key|p12|pfx)$/i.test(decodedPath)) {
    res.writeHead(404).end()
    return
  }

  if (urlPath === '/api/telemetry') {
    const origin = (isSecureRequest(req) ? 'https://' : 'http://') + req.headers.host
    return receiveNodeTelemetry(req, res, origin)
  }
  if (urlPath === '/api/health') {
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end()
      return
    }
    const healthy = fs.existsSync(path.join(DIST_DIR, 'index.html'))
    res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' })
    res.end(req.method === 'HEAD' ? undefined : healthy ? '{"status":"ok"}' : '{"status":"unavailable"}')
    return
  }
  if (urlPath === '/api' || urlPath.startsWith('/api/')) {
    return handleApiRequest(req, res, ALLOWED_ORIGINS)
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end()
    return
  }

  const redirectUrl = getCanonicalRedirect(req)
  if (redirectUrl) {
    res.writeHead(301, {
      Location: redirectUrl,
      'Content-Type': 'text/html; charset=utf-8',
    })
    res.end()
    return
  }

  let filePath = pageFileFor(urlPath) || path.join(DIST_DIR, urlPath)
  if (isServiceAlias(urlPath)) {
    res.statusCode = 404
    filePath = path.join(DIST_DIR, 'service-not-found.html')
  } else if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.statusCode = 404
    const staticError = /^\/(?:blog|projects)(?:\/|$)/.test(urlPath) || path.extname(urlPath)
    filePath = path.join(DIST_DIR, staticError ? '404.html' : '404-app.html')
  }
  if (res.statusCode === 404 || urlPath === '/404' || filePath.endsWith('service-not-found.html')) {
    res.setHeader('X-Robots-Tag', 'noindex')
  }

  try {
    const relative = path.relative(fs.realpathSync(DIST_DIR), fs.realpathSync(filePath))
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      res.writeHead(404).end()
      return
    }
  } catch {
    res.writeHead(404).end()
    return
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  res.setHeader('Content-Type', contentType)

  // Cache headers for static resources
  if (urlPath.startsWith('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico', '.woff2', '.webmanifest'].includes(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  } else if (ext === '.html') {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
  }

  const acceptEncoding = req.headers['accept-encoding'] || ''
  const isCompressible = /^(text\/|application\/(javascript|json|xml|manifest\+json)|image\/svg\+xml)/.test(contentType)

  if (req.method === 'HEAD') {
    res.end()
    return
  }

  if (isCompressible && acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip')
    res.setHeader('Vary', 'Accept-Encoding')
    const rawStream = fs.createReadStream(filePath)
    const gzipStream = zlib.createGzip({ level: 6 })
    pipeline(rawStream, gzipStream, res, (error) => reportStreamFailure(res, error))
    return
  }

  pipeline(fs.createReadStream(filePath), res, (error) => reportStreamFailure(res, error))
}

export function createRequestHandler() {
  return observeNodeRequest((req, res) => {
    const isHttps = isSecureRequest(req)

    // Behind reverse proxy with SSL termination or local environment without SSL: serve static assets directly
    if (!tlsOptions && (isHttps || isLocalRequest(req))) {
      return handleStaticRequest(req, res)
    }

    applySecurityHeaders(req, res)
    res.writeHead(req.method === 'GET' || req.method === 'HEAD' ? 301 : 307, {
      Location: getCanonicalRedirect(req, true),
      'Content-Type': 'text/html; charset=utf-8',
    })
    res.end()
  })
}

// 1. Direct or Reverse-Proxy HTTP Redirect Handler
export function createHttpRedirectServer(port = HTTP_PORT) {
  const server = http.createServer(createRequestHandler())

  if (port) {
    server.listen(port, () => {
      logListening(port, 'http')
    })
  }

  return server
}

// 2. HTTPS Server (if SSL certs provided)
export function createHttpsServer(port = HTTPS_PORT) {
  if (tlsOptions) {
    let server
    try {
      server = https.createServer(tlsOptions, observeNodeRequest(handleStaticRequest))
    } catch {
      throw new Error('The configured TLS certificate or private key is invalid.')
    }
    if (port) {
      server.listen(port, () => {
        logListening(port, 'https')
      })
    }
    return server
  }
  return null
}

export {
  getCanonicalRedirect,
  handleStaticRequest,
  CSP_POLICY,
  PERMISSIONS_POLICY,
  ALLOWED_ORIGINS,
  CANONICAL_HOST,
}

if (isDirectRun) {
  const httpsServer = createHttpsServer()
  if (httpsServer) runningServers.push(httpsServer)
  runningServers.push(createHttpRedirectServer())
}
