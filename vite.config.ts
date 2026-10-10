import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import http from 'node:http'
import path from 'node:path'
import type { Plugin, ViteDevServer, PreviewServer } from 'vite'

function httpToHttpsRedirectPlugin(options?: { httpPort?: number }): Plugin {
  const httpPort = options?.httpPort ?? 5173
  let httpServer: http.Server | null = null

  const startHttpRedirect = (targetPort: number, host: string | boolean | undefined) => {
    if (httpServer) return
    httpServer = http.createServer((req, res) => {
      const hostname = req.headers.host ? req.headers.host.split(':')[0] : 'localhost'
      const redirectUrl = `https://${hostname}:${targetPort}${req.url || '/'}`
      res.writeHead(301, {
        Location: redirectUrl,
        'Content-Type': 'text/html; charset=utf-8',
      })
      res.end(`Redirecting to <a href="${redirectUrl}">${redirectUrl}</a>`)
    })

    httpServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[http-redirect] Port ${httpPort} is already in use. HTTP redirect listener disabled.`)
      } else {
        console.error('[http-redirect] Error:', err.message)
      }
    })

    const listenHost = typeof host === 'string' && host !== '0.0.0.0' ? host : '0.0.0.0'
    httpServer.listen(httpPort, listenHost, () => {
      console.log(`  \x1b[36m➜\x1b[0m  \x1b[1mHTTP Redirect:\x1b[0m http://localhost:${httpPort}/ \x1b[33m➔\x1b[0m https://localhost:${targetPort}/`)
    })
  }

  return {
    name: 'vite-http-to-https-redirect',
    configureServer(server: ViteDevServer) {
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address()
        const targetPort = typeof address === 'object' && address ? address.port : 5174
        startHttpRedirect(targetPort, server.config.server.host)
      })
    },
    configurePreviewServer(server: PreviewServer) {
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address()
        const targetPort = typeof address === 'object' && address ? address.port : 5174
        startHttpRedirect(targetPort, server.config.preview.host)
      })
    },
    closeBundle() {
      httpServer?.close()
      httpServer = null
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl(), httpToHttpsRedirectPlugin({ httpPort: 5173 })],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: true,
  },
})

