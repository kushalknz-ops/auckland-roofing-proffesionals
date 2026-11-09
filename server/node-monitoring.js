import { monitorEventLoopDelay, performance } from 'node:perf_hooks'
import { getHeapStatistics } from 'node:v8'
import { acceptBrowserTelemetry } from './browser-telemetry.js'
import { createMonitor, exceptionDetails, requestDetails } from './monitoring.js'
import { SECURITY_HEADERS } from './security.js'

const monitor = createMonitor({
  runtime: 'node',
  environment: process.env.NODE_ENV === 'development' ? 'development' :
    process.env.MONITORING_ENV === 'preview' ? 'preview' : 'production',
  dsn: process.env.SENTRY_DSN,
  release: process.env.MONITORING_RELEASE,
})
const localMonitor = createMonitor({ runtime: 'vite', environment: 'development' })
const requestContext = new WeakMap()

export function observeNodeRequest(handler, local = false) {
  const logger = local ? localMonitor : monitor
  return async (req, res) => {
    const details = requestDetails(req.method, (req.url ?? '/').split('?', 1)[0])
    requestContext.set(res, details)
    const start = performance.now()
    let failed = false
    if (details.route.startsWith('/api/')) res.setHeader('X-Request-ID', details.request_id)
    res.once('finish', () => {
      if (!failed) void logger.response(details, res.statusCode, performance.now() - start)
    })
    res.once('close', () => {
      if (!failed && !res.writableFinished && details.route.startsWith('/api/') && details.route !== '/api/telemetry') {
        logger.error('request_aborted', 'warning', { ...details, duration_ms: Math.round(performance.now() - start) })
      }
    })
    try {
      await handler(req, res)
    } catch (error) {
      failed = true
      void logger.error('request_exception', 'error', {
        ...details, ...(res.headersSent ? {} : { status: 500 }), duration_ms: Math.round(performance.now() - start),
      }, exceptionDetails(error))
      if (res.headersSent || res.destroyed) {
        res.destroy()
      } else {
        const hsts = res.getHeader('Strict-Transport-Security')
        for (const header of res.getHeaderNames()) res.removeHeader(header)
        res.writeHead(500, {
          ...SECURITY_HEADERS, 'Cache-Control': 'no-store', 'Content-Type': 'application/json',
          'X-Request-ID': details.request_id,
          ...(hsts && { 'Strict-Transport-Security': hsts }),
        }).end('{"success":false,"message":"An unexpected error occurred."}')
      }
    }
  }
}

export function reportStreamFailure(res, error) {
  if (error && !['ERR_STREAM_PREMATURE_CLOSE', 'ECONNRESET', 'EPIPE'].includes(error.code)) {
    void monitor.error('response_stream_failed', 'error', requestContext.get(res) ?? {}, exceptionDetails(error))
  }
}

export async function receiveNodeTelemetry(req, res, origin, local = false) {
  const headers = new Headers()
  for (const name of ['origin', 'sec-fetch-site', 'content-type', 'content-length']) {
    if (typeof req.headers[name] === 'string') headers.set(name, req.headers[name])
  }
  const status = await acceptBrowserTelemetry(
    req.method, headers, origin, req.iterator({ destroyOnReturn: false }), local ? localMonitor : monitor, () => {},
  )
  res.setHeader('Cache-Control', 'no-store')
  if (status === 405) res.setHeader('Allow', 'POST')
  if (!req.readableEnded) res.setHeader('Connection', 'close')
  res.writeHead(status).end()
}

export function logListening(port, protocol) {
  monitor.write('info', 'server_listening', { port, protocol })
}

export function installProcessMonitoring(stopAcceptingRequests) {
  let crashing = false
  const fatal = async (error, origin) => {
    if (crashing) process.exit(1)
    crashing = true
    stopAcceptingRequests()
    const deadline = setTimeout(() => process.exit(1), 1750)
    try {
      await monitor.error(origin === 'unhandledRejection' ? 'unhandled_rejection' : 'uncaught_exception',
        'fatal', {}, exceptionDetails(error))
    } finally {
      clearTimeout(deadline)
      process.exit(1)
    }
  }
  process.on('uncaughtException', fatal)
  process.on('unhandledRejection', (reason) => { void fatal(reason, 'unhandledRejection') })
  if (process.env.NODE_ENV === 'development') return

  const loop = monitorEventLoopDelay({ resolution: 20 })
  loop.enable()
  const rssLimit = Number(process.env.MONITORING_RSS_LIMIT_MB) * 1024 ** 2
  let previous = performance.eventLoopUtilization()
  let previousCpu = process.cpuUsage()
  let lastSample = performance.now()
  let stressed = 0
  setInterval(() => {
    const now = performance.now()
    const cpu = process.cpuUsage()
    const current = performance.eventLoopUtilization()
    const { rss, heapUsed } = process.memoryUsage()
    const fields = {
      uptime_s: Math.round(process.uptime()),
      rss_bytes: rss,
      heap_used_bytes: heapUsed,
      cpu_pct_of_core: Math.round(((cpu.user - previousCpu.user) + (cpu.system - previousCpu.system)) / ((now - lastSample) * 10)),
      event_loop_utilization_pct: Math.round(performance.eventLoopUtilization(current, previous).utilization * 100),
      event_loop_p95_ms: Math.round(loop.percentile(95) / 1e6),
    }
    previous = current
    previousCpu = cpu
    lastSample = now
    loop.reset()
    monitor.write('info', 'server_resources', fields)
    const unhealthy = fields.event_loop_utilization_pct >= 90 || fields.event_loop_p95_ms >= 100 ||
      heapUsed >= getHeapStatistics().heap_size_limit * 0.85 || (rssLimit > 0 && rss >= rssLimit)
    stressed = unhealthy ? stressed + 1 : 0
    if (stressed === 3 || (stressed > 3 && stressed % 15 === 0)) {
      void monitor.error('server_resource_pressure', 'error', fields)
    }
  }, 60_000).unref()
}
