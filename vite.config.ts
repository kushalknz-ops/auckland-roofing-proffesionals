import { defineConfig, loadEnv, type Plugin, type PreviewServer, type ViteDevServer } from 'vite'
import { createHash } from 'node:crypto'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { isSecureRequest, readAllowedOrigins } from './server/config.js'
import { CSP_POLICY, HSTS_POLICY, SECURITY_HEADERS } from './server/security.js'

function responsePolicyPlugin(allowedOrigins: ReadonlySet<string>, development: boolean): Plugin {
  // React's development preamble is the only inline script Vite needs.
  const preambleHash = createHash('sha256').update(react.preambleCode.replace('__BASE__', '/')).digest('base64')
  const csp = development
    ? CSP_POLICY
      .replace("script-src 'self'", "script-src 'self' 'sha256-" + preambleHash + "'")
      .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
      .replace("connect-src 'self'", "connect-src 'self' ws://127.0.0.1:* ws://localhost:*")
      .replace('; upgrade-insecure-requests', '')
    : CSP_POLICY
  const headers = { ...SECURITY_HEADERS, 'Content-Security-Policy': csp }

  const configure = async (server: ViteDevServer | PreviewServer) => {
    const { handleApiRequest } = await import('./server/api.js')
    const { observeNodeRequest, receiveNodeTelemetry } = await import('./server/node-monitoring.js')
    const handleLocalApi = observeNodeRequest((req, res) => {
      if (req.url?.split('?', 1)[0] === '/api/telemetry') {
        const origin = (isSecureRequest(req) ? 'https://' : 'http://') + req.headers.host
        return receiveNodeTelemetry(req, res, origin, true)
      }
      return handleApiRequest(req, res, allowedOrigins)
    }, true)
    server.middlewares.use(async (req, res, next) => {
      for (const [name, value] of Object.entries(headers)) res.setHeader(name, value)
      if (isSecureRequest(req)) res.setHeader('Strict-Transport-Security', HSTS_POLICY)
      const pathname = req.url?.split('?')[0]
      if (pathname === '/api' || pathname?.startsWith('/api/')) {
        // This middleware runs before Vite's host check. Reject DNS rebinding on the local API.
        if (!/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(req.headers.host ?? '')) {
          res.writeHead(403, { 'Cache-Control': 'no-store' }).end()
          return
        }
        await handleLocalApi(req, res)
      } else {
        next()
      }
    })
  }
  return {
    name: 'response-policy',
    configureServer: configure,
    async configurePreviewServer(server) {
      await configure(server)
      const serverEntry = pathToFileURL(path.resolve(server.config.root, 'server.js')).href
      const { handleStaticRequest }: {
        handleStaticRequest: (req: IncomingMessage, res: ServerResponse) => void
      } = await import(serverEntry)
      server.middlewares.use(handleStaticRequest)
    },
  }
}

const sensitiveFiles = ['.env', '.env.*', '.dev.vars', '.dev.vars.*', '.npmrc', '*.pem', '*.key', '*.crt', '*.cer', '*.p12', '*.pfx']
const blockedPublicFile = /^(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|\.git|\.npmrc)$|\.(?:pem|key|crt|cer|p12|pfx|map)$/i

export default defineConfig(({ command, mode, isPreview }) => {
  const development = command === 'serve' && !isPreview
  const originKey = development ? 'DEV_ALLOWED_ORIGINS' : 'ALLOWED_ORIGINS'
  const allowedOrigins = command === 'serve'
    ? readAllowedOrigins(loadEnv(mode, import.meta.dirname, originKey)[originKey], development)
    : new Set<string>()
  const publicDir = path.resolve(import.meta.dirname, 'public')
  const entries = readdirSync(publicDir, { recursive: true, withFileTypes: true })
  if (entries.some((entry) => entry.isSymbolicLink() || blockedPublicFile.test(entry.name))) {
    throw new Error('The public directory contains a restricted file, directory or symbolic link.')
  }

  const value = loadEnv(mode, import.meta.dirname, 'VITE_SITE_URL').VITE_SITE_URL
  let publicSiteUrl
  if (value) {
    try {
      const url = new URL(value)
      if (!/^https?:$/.test(url.protocol) || url.username || url.password ||
          url.pathname !== '/' || url.search || url.hash) throw new Error()
      publicSiteUrl = url.origin
    } catch {
      throw new Error('VITE_SITE_URL must contain an HTTP(S) origin without credentials, a path, query or fragment.')
    }
  }

  return {
    envPrefix: [],
    define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify(publicSiteUrl ?? '') },
    plugins: [react(), tailwindcss(), responsePolicyPlugin(allowedOrigins, development)],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: true,
      fs: {
        deny: [...sensitiveFiles, '**/.git/**', '**/server/**', '**/server.js', '**/*.local/**', '**/artifacts/**'],
      },
      cors: false,
    },
    preview: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: true,
      cors: false,
    },
    build: {
      sourcemap: false,
      target: 'esnext',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-react'
            }
            if (id.includes('node_modules/react-router')) {
              return 'vendor-router'
            }
          },
        },
      },
    },
  }
})
