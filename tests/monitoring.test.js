import assert from 'node:assert/strict'
import { once } from 'node:events'
import { spawnSync } from 'node:child_process'
import http from 'node:http'
import test from 'node:test'
import { createMonitor } from '../server/monitoring.js'
import { observeNodeRequest } from '../server/node-monitoring.js'
import { observeEdgeRequest } from '../server/edge-monitoring.js'

const origin = 'https://example.test'
const secretMarker = 'private@example.test password=SyntheticSecret'
const dsn = 'https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@o1.ingest.sentry.io/123'

test('edge errors and browser events reach a Sentry envelope with allowlisted context', async (t) => {
  const envelopes = []
  const logs = []
  t.mock.method(Math, 'random', () => 0.5)
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, 'https://o1.ingest.sentry.io/api/123/envelope/')
    assert.equal(init.redirect, 'error')
    envelopes.push(init.body.split('\n').map(JSON.parse))
    return new Response(null, { status: 200 })
  })
  t.mock.method(console, 'error', (record) => logs.push(JSON.parse(record)))
  t.mock.method(console, 'info', (record) => logs.push(JSON.parse(record)))
  const env = { MONITORING_ENV: 'production', SENTRY_DSN: dsn, CF_PAGES_COMMIT_SHA: 'a'.repeat(40) }
  const queued = []
  const ctx = { waitUntil: (promise) => queued.push(promise) }
  const request = (path, init, handle = () => assert.fail('Reserved route fell through')) =>
    observeEdgeRequest(new Request(origin + path, init), env, ctx, 'pages', handle)
  const report = (data, from = origin) => request('/api/telemetry', {
    method: 'POST',
    headers: { Origin: from, 'Content-Type': 'application/json', Cookie: secretMarker },
    body: JSON.stringify(data),
  })

  const failure = await request('/api/contact?secret=SyntheticSecret', { method: 'POST' }, () => {
    throw new TypeError(secretMarker)
  })
  assert.equal(failure.status, 500)
  assert.equal(failure.headers.get('X-Request-ID'), logs[0].request_id)
  assert.ok(!(await failure.text()).includes(secretMarker))
  assert.equal((await request('/api/enquiry', undefined, () => new Response(null, { status: 503 }))).status, 503)

  assert.equal((await report({
    event: 'browser_exception', route: '/projects/private@example.test', message: secretMarker, type: 'TypeError',
    frames: [{ bundle: 'index', line: 12, column: 4 }, { bundle: secretMarker, line: 1, column: 1 }],
  })).status, 204)
  assert.equal((await report({ event: 'browser_navigation', route: '/', duration_ms: 220, ttfb_ms: 35 })).status, 204)
  assert.equal((await report({ event: 'browser_exception', route: '/' }, 'https://evil.test')).status, 403)
  assert.equal((await report({ event: secretMarker, route: '/' })).status, 400)
  assert.equal((await report({ event: 'browser_exception', route: 'x'.repeat(3000) })).status, 413)
  assert.deepEqual(await (await request('/api/health')).json(), { status: 'ok' })
  await Promise.all(queued)

  assert.deepEqual(envelopes.map(([, item]) => item.type), ['event', 'event', 'event', 'transaction'])
  assert.equal(envelopes[0][2].tags.category, 'request_exception')
  assert.equal(envelopes[1][2].extra.status, 503)
  assert.equal(envelopes[2][2].extra.route, '/projects/:project')
  assert.deepEqual(envelopes[2][2].exception.values[0].stacktrace.frames, [
    { filename: 'assets/index.js', lineno: 12, colno: 4, in_app: true },
  ])
  assert.equal(envelopes[3][2].measurements.ttfb.value, 35)
  assert.ok(envelopes[3][2].timestamp >= envelopes[3][2].start_timestamp)
  for (const payload of [JSON.stringify(envelopes), JSON.stringify(logs)]) {
    assert.doesNotMatch(payload, /SyntheticSecret|private@example.test|Cookie/)
  }
})

test('Sentry throttling pauses delivery and leaves a safe diagnostic', async (t) => {
  t.mock.method(console, 'error', () => {})
  const warn = t.mock.method(console, 'warn', () => {})
  const send = t.mock.method(globalThis, 'fetch', async () => new Response(null, {
    status: 429, headers: { 'Retry-After': '120' },
  }))
  const monitor = createMonitor({ runtime: 'node', environment: 'production', dsn })
  await monitor.error('first_error', 'error', {})
  await monitor.error('second_error', 'error', {})
  assert.equal(send.mock.callCount(), 1)
  assert.equal(JSON.parse(warn.mock.calls[0].arguments[0]).event, 'monitoring_delivery_failed')
})

test('Node handles a rejected request, responds safely, and remains available', async (t) => {
  const errors = t.mock.method(console, 'error', () => {})
  const server = http.createServer(observeNodeRequest(async (req, res) => {
    if (req.url.startsWith('/api/contact')) throw new Error(secretMarker)
    res.end('ok')
  })).listen(0, '127.0.0.1')
  t.after(() => server.close())
  await once(server, 'listening')
  const url = 'http://127.0.0.1:' + server.address().port
  const response = await fetch(url + '/api/contact?token=SyntheticSecret')
  assert.equal(response.status, 500)
  const log = JSON.parse(errors.mock.calls[0].arguments[0])
  assert.equal(log.request_id, response.headers.get('X-Request-ID'))
  assert.equal(log.route, '/api/contact')
  assert.doesNotMatch(JSON.stringify(log) + await response.text(), /SyntheticSecret|private@example.test/)
  assert.equal(await (await fetch(url)).text(), 'ok')
})

test('fatal startup errors are structured and exit with failure', () => {
  const child = spawnSync(process.execPath, ['server.js'], {
    env: { ...process.env, CANONICAL_HOST: 'SyntheticSecret', SENTRY_DSN: '' }, encoding: 'utf8', timeout: 5000,
  })
  assert.equal(child.status, 1)
  assert.equal(JSON.parse(child.stderr.trim()).level, 'fatal')
  assert.doesNotMatch(child.stderr, /SyntheticSecret/)
})
