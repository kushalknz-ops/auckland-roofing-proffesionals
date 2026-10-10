/**
 * Auckland Roof Professionals - Node.js Production Server
 * Serves Vite static build (dist/), redirects HTTP to HTTPS, and supports reverse proxy headers.
 */

import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
}

function handleStaticRequest(req, res) {
  const urlPath = req.url?.split('?')[0] || '/'
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath)

  // SPA fallback: If requested file does not exist, serve index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html')
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  // Security headers
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Content-Type', contentType)

  if (urlPath.startsWith('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }

  fs.createReadStream(filePath).pipe(res)
}

// 1. Direct or Reverse-Proxy HTTP Redirect Handler
function createHttpRedirectServer() {
  const server = http.createServer((req, res) => {
    const forwardedProto = req.headers['x-forwarded-proto']
    const isHttps = forwardedProto === 'https'

    // Behind reverse proxy with SSL termination: serve static assets if HTTPS
    if (isHttps && !SSL_KEY) {
      handleStaticRequest(req, res)
      return
    }

    // Otherwise redirect HTTP -> HTTPS
    const host = req.headers.host ? req.headers.host.split(':')[0] : 'localhost'
    const portSuffix = HTTPS_PORT === 443 ? '' : `:${HTTPS_PORT}`
    const targetUrl = `https://${host}${portSuffix}${req.url || '/'}`

    res.writeHead(301, {
      Location: targetUrl,
      'Content-Type': 'text/html; charset=utf-8',
    })
    res.end(`Redirecting to <a href="${targetUrl}">${targetUrl}</a>`)
  })

  server.listen(HTTP_PORT, () => {
    console.log(`[HTTP Server] Listening on port ${HTTP_PORT} (Redirects traffic to HTTPS)`)
  })
}

// 2. HTTPS Server (if SSL certs provided)
function createHttpsServer() {
  if (SSL_KEY && SSL_CERT) {
    const server = https.createServer({ key: SSL_KEY, cert: SSL_CERT }, (req, res) => {
      handleStaticRequest(req, res)
    })
    server.listen(HTTPS_PORT, () => {
      console.log(`[HTTPS Server] Listening on secure port ${HTTPS_PORT}`)
    })
  }
}

createHttpRedirectServer()
createHttpsServer()
