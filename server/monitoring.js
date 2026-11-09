const apiRoutes = new Set(['/api/contact', '/api/enquiry', '/api/quote', '/api/health', '/api/telemetry'])
const pageRoutes = new Set(['/', '/commercial', '/residential', '/contact', '/service', '/blog'])
const methods = new Set(['GET', 'HEAD', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'])
const errorTypes = new Set(['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'AggregateError'])
const maxInFlight = 4
const limits = { server: 60, browser: 30, warning: 30, performance: 60 }

export function routeLabel(pathname) {
  if (apiRoutes.has(pathname) || pageRoutes.has(pathname)) return pathname
  if (pathname === '/api' || pathname.startsWith('/api/')) return '/api/*'
  if (pathname.startsWith('/service/')) return '/service'
  if (pathname.startsWith('/blog/')) return '/blog/:article'
  if (pathname.startsWith('/projects/')) return '/projects/:project'
  if (pathname.startsWith('/assets/')) return '/assets/*'
  return 'other'
}

export function requestDetails(method, pathname) {
  return {
    method: methods.has(method) ? method : 'OTHER',
    route: routeLabel(pathname),
    request_id: crypto.randomUUID(),
  }
}

export function exceptionDetails(error) {
  try {
    const name = errorTypes.has(error?.name) ? error.name : 'Error'
    const stack = error?.stack
    const frames = typeof stack === 'string'
      ? stack.slice(0, 8192).split('\n').slice(1)
        .map((line) => /\/(server\.js|server\/(?:api|monitoring|edge-monitoring|static-worker|node-monitoring|security|validation|config|seo)\.js):(\d{1,7}):(\d{1,7})\)?$/.exec(line))
        .filter(Boolean).slice(0, 5).reverse()
        .map(([, filename, line, column]) => ({ filename, lineno: Number(line), colno: Number(column), in_app: true }))
      : []
    return { type: name, frames }
  } catch {
    return { type: 'Error', frames: [] }
  }
}

export function minuteBudget(limit) {
  let minute = -1
  let count = 0
  return () => {
    const current = Math.floor(Date.now() / 60_000)
    if (current !== minute) {
      minute = current
      count = 0
    }
    if (count >= limit) return false
    count++
    return true
  }
}

function parseDsn(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*ingest(?:\.[a-z]+)?\.sentry\.io$/.test(url.hostname) ||
        !/^[a-f0-9]{32}$/i.test(url.username) || !/^\/\d+$/.test(url.pathname) ||
        url.password || url.port || url.search || url.hash) return null
    return { dsn: url.href, url: url.origin + '/api' + url.pathname + '/envelope/' }
  } catch {
    return null
  }
}

export function createMonitor({ runtime, environment, dsn, release }) {
  const destination = environment !== 'development' && parseDsn(dsn)
  const version = /^[a-f0-9]{7,40}$/i.test(release ?? '') ? { release } : {}
  const budgets = Object.fromEntries(Object.entries(limits).map(([key, limit]) => [key, minuteBudget(limit)]))
  const write = (level, event, fields = {}) => {
    const record = { timestamp: new Date().toISOString(), level, event, runtime, environment, ...version, ...fields }
    const output = level === 'fatal' || level === 'error' ? console.error : level === 'warning' ? console.warn : console.info
    output(JSON.stringify(record))
  }
  if (dsn && !destination && environment !== 'development') write('warning', 'monitoring_configuration_invalid')

  let inFlight = 0
  let pausedUntil = 0
  async function send(item, body, limit = maxInFlight - 2) {
    if (!destination || inFlight >= limit || Date.now() < pausedUntil) return
    const id = crypto.randomUUID().replaceAll('-', '')
    const timestamp = Date.now() / 1000
    const envelope = [
      JSON.stringify({ event_id: id, dsn: destination.dsn }),
      JSON.stringify({ type: item }),
      JSON.stringify({
        event_id: id, timestamp, platform: 'javascript', environment,
        ...version,
        ...body,
      }),
    ].join('\n')
    inFlight++
    try {
      const response = await fetch(destination.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-sentry-envelope' },
        body: envelope,
        redirect: 'error',
        signal: AbortSignal.timeout(1500),
      })
      if (!response.ok && Date.now() >= pausedUntil) {
        const retry = Number(response.headers.get('Retry-After')) || 60
        pausedUntil = Date.now() + Math.max(60, retry) * 1000
        write('warning', 'monitoring_delivery_failed', { status: response.status })
      }
      await response.body?.cancel()
    } catch {
      if (Date.now() >= pausedUntil) {
        pausedUntil = Date.now() + 60_000
        write('warning', 'monitoring_delivery_failed')
      }
    } finally {
      inFlight--
    }
  }

  function error(event, level, fields, exception, source = 'server') {
    if (level !== 'fatal' && !budgets[level === 'warning' ? 'warning' : source]()) return
    write(level, event, { ...fields, ...(exception && { exception }) })
    if (level === 'warning') return
    const location = exception?.frames.at(-1)
    return send('event', {
      level,
      message: event,
      tags: { runtime, source, category: event, route: fields.route ?? 'other' },
      extra: fields,
      fingerprint: [runtime, source, event, fields.route ?? 'other',
        ...(location ? [location.filename, String(location.lineno), String(location.colno)] : [])],
      ...(exception && {
        exception: { values: [{ type: exception.type, value: event, stacktrace: { frames: exception.frames } }] },
      }),
    }, level === 'fatal' ? maxInFlight + 1 : source === 'server' ? maxInFlight : maxInFlight - 2)
  }

  function timing(op, fields, measurements) {
    if (!budgets.performance()) return
    write('info', op, fields)
    if (!destination) return
    return send('transaction', {
      type: 'transaction',
      transaction: fields.route,
      transaction_info: { source: 'route' },
      start_timestamp: (Date.now() - fields.duration_ms) / 1000,
      spans: [],
      contexts: {
        trace: {
          trace_id: crypto.randomUUID().replaceAll('-', ''),
          span_id: crypto.randomUUID().replaceAll('-', '').slice(0, 16),
          op,
          status: fields.status >= 500 ? 'internal_error' : fields.status >= 400 ? 'invalid_argument' : 'ok',
        },
      },
      tags: { runtime, route: fields.route, category: op },
      extra: fields,
      ...(measurements && { measurements }),
    })
  }

  function response(fields, status, duration) {
    if (fields.route === '/api/telemetry' || fields.route === '/api/health') return
    const context = { ...fields, status, duration_ms: Math.round(duration) }
    const api = fields.route.startsWith('/api/')
    let issue
    if (status >= 500) issue = error('http_server_error', 'error', context)
    else if (api && duration >= 1500) issue = error('slow_api_request', 'error', context)
    else if (status >= 400 && (environment === 'development' || Math.random() < 0.1)) {
      error('http_client_error', 'warning', context)
    }
    if (api && (environment === 'development' || Math.random() < 0.1)) {
      const sample = timing('http.server', context)
      if (sample && issue) return Promise.all([issue, sample])
      return issue ?? sample
    }
    return issue
  }

  return { error, response, timing, write }
}
