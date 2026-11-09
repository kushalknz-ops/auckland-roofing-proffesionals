import { acceptBrowserTelemetry } from './browser-telemetry.js'
import { createMonitor, exceptionDetails, requestDetails } from './monitoring.js'
import { HSTS_POLICY, SECURITY_HEADERS } from './security.js'

let monitor

export async function observeEdgeRequest(request, env, context, runtime, handler) {
  monitor ??= createMonitor({
    runtime,
    environment: env.MONITORING_ENV === 'production' ? 'production' : 'preview',
    dsn: env.SENTRY_DSN,
    release: env.CF_PAGES_COMMIT_SHA ?? env.MONITORING_RELEASE,
  })
  const schedule = (work) => {
    if (work) context?.waitUntil(work)
  }
  const { pathname, origin, protocol } = new URL(request.url)
  const details = requestDetails(request.method, pathname)
  const start = performance.now()
  const headers = new Headers({ ...SECURITY_HEADERS, 'Cache-Control': 'no-store' })
  if (protocol === 'https:') headers.set('Strict-Transport-Security', HSTS_POLICY)
  try {
    if (pathname === '/api/telemetry') {
      const status = await acceptBrowserTelemetry(request.method, request.headers, origin, request.body, monitor, schedule)
      if (status === 405) headers.set('Allow', 'POST')
      return new Response(null, { status, headers })
    }
    if (pathname === '/api/health') {
      if (!['GET', 'HEAD'].includes(request.method)) {
        headers.set('Allow', 'GET, HEAD')
        return new Response(null, { status: 405, headers })
      }
      headers.set('Content-Type', 'application/json')
      return new Response(request.method === 'HEAD' ? null : '{"status":"ok"}', { headers })
    }
    const response = await handler()
    schedule(monitor.response(details, response.status, performance.now() - start))
    if (details.route.startsWith('/api/')) response.headers.set('X-Request-ID', details.request_id)
    return response
  } catch (error) {
    schedule(monitor.error('request_exception', 'error', {
      ...details, status: 500, duration_ms: Math.round(performance.now() - start),
    }, exceptionDetails(error)))
    headers.set('X-Request-ID', details.request_id)
    return Response.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500, headers })
  }
}
