import { minuteBudget, routeLabel } from './monitoring.js'

const errorKinds = new Set([
  'react_caught', 'react_uncaught', 'react_recoverable', 'browser_exception', 'browser_rejection',
  'resource_failed', 'api_network_error', 'api_http_error', 'api_invalid_response',
])
const bundles = new Set(['index', 'vendor-react', 'vendor-router', 'BlogPage', 'ProjectPage', 'LegalPage'])
const types = new Set(['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'AggregateError'])
const submissionRoutes = new Set(['/api/contact', '/api/enquiry'])
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const maxBytes = 2048
const acceptEvent = minuteBudget(120)

function milliseconds(value) {
  return Number.isInteger(value) && value >= 0 && value <= 120_000 ? value : undefined
}

export async function acceptBrowserTelemetry(method, headers, origin, body, monitor, schedule) {
  if (method !== 'POST') return 405
  if (headers.get('Origin') !== origin || !['same-origin', null].includes(headers.get('Sec-Fetch-Site'))) return 403
  if (headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') return 415
  if (Number(headers.get('Content-Length')) > maxBytes) return 413
  if (!acceptEvent()) return 429

  let data
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    let bytes = 0
    let json = ''
    for await (const chunk of body ?? []) {
      bytes += chunk.byteLength
      if (bytes > maxBytes) return 413
      json += decoder.decode(chunk, { stream: true })
    }
    data = JSON.parse(json + decoder.decode())
  } catch {
    return 400
  }
  if (!data || typeof data.route !== 'string') return 400
  const context = { route: routeLabel(data.route) }
  const duration = milliseconds(data.duration_ms)
  if (duration !== undefined) context.duration_ms = duration

  if (data.event === 'browser_navigation' && duration !== undefined) {
    const ttfb = milliseconds(data.ttfb_ms)
    schedule(monitor.timing('pageload', context, ttfb === undefined ? undefined : {
      ttfb: { value: ttfb, unit: 'millisecond' },
    }))
    return 204
  }
  if (!errorKinds.has(data.event)) return 400

  let exception
  if (data.event.startsWith('api_')) {
    if (!submissionRoutes.has(data.api)) return 400
    context.api = data.api
    if (Number.isInteger(data.status) && data.status >= 200 && data.status <= 599) context.status = data.status
    if (typeof data.request_id === 'string' && uuid.test(data.request_id)) context.request_id = data.request_id
  } else if (data.event === 'resource_failed') {
    if (!['script', 'link', 'img', 'source', 'video'].includes(data.resource)) return 400
    context.resource = data.resource
  } else {
    const frames = Array.isArray(data.frames) ? data.frames.slice(0, 5)
      .filter((frame) => bundles.has(frame?.bundle) && Number.isInteger(frame.line) && frame.line > 0 && frame.line <= 1e7 &&
        Number.isInteger(frame.column) && frame.column > 0 && frame.column <= 1e7)
      .map(({ bundle, line, column }) => ({ filename: `assets/${bundle}.js`, lineno: line, colno: column, in_app: !bundle.startsWith('vendor-') })) : []
    exception = { type: types.has(data.type) ? data.type : 'Error', frames }
  }
  // A correlated 5xx already creates a server issue. Client context stays in the JSON log.
  const warning = data.event === 'react_recoverable' ||
    (data.event === 'api_http_error' && (context.status < 500 || context.request_id))
  schedule(monitor.error(data.event, warning ? 'warning' : 'error', context, exception, 'browser'))
  return 204
}
