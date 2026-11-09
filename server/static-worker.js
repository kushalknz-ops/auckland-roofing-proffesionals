import { unavailableApiResponse } from './security.js'
import { observeEdgeRequest } from './edge-monitoring.js'
import { handlePageAlias } from './service-pages.js'

async function serve(request, ASSETS) {
  const { pathname } = new URL(request.url)
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return unavailableApiResponse(request)
  }

  const alias = await handlePageAlias(request, ASSETS)
  if (alias) return alias
  const page = await ASSETS.fetch(request)
  if (page.status !== 404 || (request.method !== 'GET' && request.method !== 'HEAD')) return page
  const fallback = await ASSETS.fetch(new Request(new URL('/404', request.url), { method: request.method }))
  const headers = new Headers(fallback.headers)
  headers.set('X-Robots-Tag', 'noindex')
  return new Response(fallback.body, { status: 404, headers })
}

export default {
  fetch(request, env, context) {
    return observeEdgeRequest(request, env, context, 'worker', () => serve(request, env.ASSETS))
  },
}
