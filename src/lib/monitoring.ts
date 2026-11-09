const publicRoutes = new Set(['/', '/commercial', '/residential', '/contact', '/service', '/blog'])
const seenErrors = new WeakSet<object>()
let errorsSent = 0

function pageRoute(pathname = window.location.pathname) {
  const route = pathname.replace(/\/+$/, '') || '/'
  if (publicRoutes.has(route)) return route
  if (route.startsWith('/service/')) return '/service'
  if (route.startsWith('/blog/')) return '/blog/:article'
  if (route.startsWith('/projects/')) return '/projects/:project'
  return 'other'
}

function report(event: string, details: Record<string, unknown> = {}) {
  const timing = event === 'browser_navigation'
  if (!timing && errorsSent++ >= 8) return
  const record = { event, route: pageRoute(), ...details }
  if (import.meta.env.DEV) {
    const level = timing ? 'info' : event === 'react_recoverable' ? 'warning' : 'error'
    const output = level === 'info' ? console.info : level === 'warning' ? console.warn : console.error
    output(JSON.stringify({ ...record, level, timestamp: new Date().toISOString(), runtime: 'browser', environment: 'development' }))
    return
  }
  void fetch('/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    redirect: 'error',
    keepalive: true,
  }).catch(() => {})
}

function reportException(event: string, value: unknown) {
  if (!(value instanceof Error)) {
    report(event)
    return
  }
  if (seenErrors.has(value)) return
  seenErrors.add(value)
  const types = ['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'AggregateError']
  const frames = typeof value.stack === 'string'
    ? value.stack.slice(0, 8192).split('\n').slice(1).flatMap((line) => {
      const match = /(?:\(|\s|@)(https?:\/\/[^\s()]+):(\d{1,7}):(\d{1,7})\)?$/.exec(line)
      if (!match || !match[1].startsWith(window.location.origin + '/')) return []
      const bundle = /^\/assets\/(index|vendor-react|vendor-router|BlogPage|ProjectPage|LegalPage)-[\w-]+\.js$/.exec(match[1].slice(window.location.origin.length))
      return bundle
        ? [{ bundle: bundle[1], line: Number(match[2]), column: Number(match[3]) }] : []
    }).slice(0, 5).reverse() : []
  report(event, { type: types.includes(value.name) ? value.name : 'Error', frames })
}

export const reactMonitoring = {
  onCaughtError: (error: unknown) => reportException('react_caught', error),
  onUncaughtError: (error: unknown) => reportException('react_uncaught', error),
  onRecoverableError: (error: unknown) => reportException('react_recoverable', error),
}

export function installBrowserMonitoring() {
  window.addEventListener('error', (event: Event) => {
    if (event instanceof ErrorEvent) {
      reportException('browser_exception', event.error)
      event.preventDefault()
      return
    }
    const resource = (event.target as Element | null)?.localName
    if (resource && ['script', 'link', 'img', 'source', 'video'].includes(resource)) {
      report('resource_failed', { resource })
    }
  }, true)
  window.addEventListener('unhandledrejection', (event) => {
    reportException('browser_rejection', event.reason)
    event.preventDefault()
  })
  if (Math.random() >= 0.05 && !import.meta.env.DEV) return
  const recordNavigation = () => setTimeout(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (navigation?.loadEventEnd) {
      report('browser_navigation', {
        duration_ms: Math.round(navigation.loadEventEnd),
        ttfb_ms: Math.round(navigation.responseStart - navigation.requestStart),
      })
    }
  }, 0)
  if (document.readyState === 'complete') recordNavigation()
  else window.addEventListener('load', recordNavigation, { once: true })
}

export async function fetchSubmission(api: '/api/contact' | '/api/enquiry', options: RequestInit) {
  const start = performance.now()
  const duration = () => Math.round(performance.now() - start)
  let res
  try {
    res = await fetch(api, options)
  } catch (error) {
    report('api_network_error', { api, duration_ms: duration() })
    throw error
  }
  const result = await res.json().catch(() => null)
  const requestId = res.headers.get('X-Request-ID')
  const fields = {
    api, status: res.status, duration_ms: duration(),
    ...(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(requestId ?? '') && {
      request_id: requestId,
    }),
  }
  if (!res.ok && res.status !== 400 && res.status !== 429) report('api_http_error', fields)
  else if (res.ok && result?.success !== true) report('api_invalid_response', fields)
  return { res, result }
}
