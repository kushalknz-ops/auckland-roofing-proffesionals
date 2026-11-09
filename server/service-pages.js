import { SERVICES } from '../src/data/services.ts'
import { CANONICAL_HOST, CANONICAL_ORIGIN, normalizePagePath } from '../src/lib/site-url.ts'
import { HSTS_POLICY, SECURITY_HEADERS } from './security.js'

export function isServiceAlias(pathname) {
  return pathname === '/service' || pathname === '/service-default'
}

export function serviceRedirectPath(searchParams) {
  const id = searchParams.get('id')?.toLowerCase()
  const service = id ? SERVICES.find((service) => service.id === id) : SERVICES[0]
  if (!service) return null
  searchParams.delete('id')
  const search = searchParams.toString()
  return `/service/${service.id}${search ? `?${search}` : ''}`
}

export async function handlePageAlias(request, assets) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null
  const url = new URL(request.url)
  const { pathname, hostname } = url
  const clean = normalizePagePath(pathname)
  if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(clean)) return null

  const productionHost = hostname === CANONICAL_HOST || hostname === `www.${CANONICAL_HOST}`
  const origin = productionHost ? CANONICAL_ORIGIN : url.origin
  let target
  if (isServiceAlias(clean)) {
    target = serviceRedirectPath(url.searchParams)
    if (!target) {
      const page = await assets.fetch(new Request(new URL('/service-not-found', url), { method: request.method }))
      const headers = new Headers(page.headers)
      headers.set('X-Robots-Tag', 'noindex')
      return new Response(page.body, { status: 404, headers })
    }
  } else if (pathname !== clean || origin !== url.origin) {
    // Only redirect to paths backed by an HTML page. Leave unknown URLs as 404s.
    const page = await assets.fetch(new Request(new URL(clean, url), { method: 'HEAD' }))
    if (page.ok && page.headers.get('content-type')?.startsWith('text/html')) {
      target = clean + url.search
    }
  }
  if (!target) return null
  const headers = { ...SECURITY_HEADERS, Location: origin + target }
  if (url.protocol === 'https:') headers['Strict-Transport-Security'] = HSTS_POLICY
  return new Response(null, { status: 301, headers })
}
