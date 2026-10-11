import { spawn } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import axe from 'axe-core'

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const PORT = 8123
const DEBUG_PORT = 9333

// Simple CDP client over native WebSocket
class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.id = 1
    this.callbacks = new Map()
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl)
      this.ws.onopen = () => resolve()
      this.ws.onerror = (err) => reject(err)
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id)
          this.callbacks.delete(msg.id)
          if (msg.error) reject(new Error(msg.error.message))
          else resolve(msg.result)
        }
      }
    })
  }

  async send(method, params = {}) {
    const id = this.id++
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  close() {
    if (this.ws) this.ws.close()
  }
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

import { handleStaticRequest } from '../server.js'

async function main() {
  console.log('Building project before testing...')
  const server = http.createServer((req, res) => handleStaticRequest(req, res))
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve))
  console.log(`Server is ready on port ${PORT}. Launching headless browser...`)

  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-allow-origins=*',
      `http://127.0.0.1:${PORT}/`,
    ],
    { stdio: 'ignore' }
  )

  let targets
  for (let i = 0; i < 30; i++) {
    try {
      targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json`)
      if (targets && targets.length) break
    } catch {
      await sleep(300)
    }
  }

  if (!targets || !targets.length) {
    chromeProcess.kill()
    server.close()
    throw new Error('Failed to connect to browser CDP.')
  }


  const pageTarget = targets.find((t) => t.type === 'page') || targets[0]
  const client = new CdpClient(pageTarget.webSocketDebuggerUrl)
  await client.connect()
  await client.send('Page.enable')
  await client.send('Runtime.enable')

  const routesToTest = [
    { name: 'Home Page (Desktop)', url: `http://127.0.0.1:${PORT}/`, viewport: { width: 1280, height: 800 } },
    { name: 'Home Page (Mobile)', url: `http://127.0.0.1:${PORT}/`, viewport: { width: 375, height: 667, mobile: true } },
    { name: 'Commercial Page', url: `http://127.0.0.1:${PORT}/commercial`, viewport: { width: 1280, height: 800 } },
    { name: 'Residential Page', url: `http://127.0.0.1:${PORT}/residential`, viewport: { width: 1280, height: 800 } },
    { name: 'Service Detail Page', url: `http://127.0.0.1:${PORT}/service?id=metal-roofs-cladding`, viewport: { width: 1280, height: 800 } },
    { name: 'Contact Page', url: `http://127.0.0.1:${PORT}/contact`, viewport: { width: 1280, height: 800 } },
    { name: 'Contact Page (Mobile)', url: `http://127.0.0.1:${PORT}/contact`, viewport: { width: 375, height: 667, mobile: true } },
    { name: '404 Page', url: `http://127.0.0.1:${PORT}/404`, viewport: { width: 1280, height: 800 } },
  ]

  const auditReport = []

  for (const route of routesToTest) {
    console.log(`\n========================================`)
    console.log(`Auditing: ${route.name} (${route.url})`)
    console.log(`========================================`)

    // Set viewport
    if (route.viewport) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: route.viewport.width,
        height: route.viewport.height,
        deviceScaleFactor: 1,
        mobile: !!route.viewport.mobile,
      })
    }

    // Navigate
    await client.send('Page.navigate', { url: route.url })
    await sleep(2000) // Wait for React hydration & reveal animations

    // Inject axe
    await client.send('Runtime.evaluate', {
      expression: axe.source,
      returnByValue: false,
    })

    // Run axe
    const axeExpr = `
      new Promise((resolve) => {
        axe.run(document, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
          }
        }, (err, results) => {
          if (err) resolve({ error: err.message });
          else resolve(results);
        });
      })
    `

    const axeResult = await client.send('Runtime.evaluate', {
      expression: axeExpr,
      awaitPromise: true,
      returnByValue: true,
    })

    const results = axeResult.result.value
    if (results.error) {
      console.error('Axe error:', results.error)
      continue
    }

    console.log(`Passes: ${results.passes.length}`)
    console.log(`Violations: ${results.violations.length}`)

    auditReport.push({
      route: route.name,
      passes: results.passes.length,
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          target: n.target.join(' '),
          html: n.html.slice(0, 100),
          failureSummary: n.failureSummary,
        })),
      })),
    })

    if (results.violations.length > 0) {
      for (const v of results.violations) {
        console.log(`\n  [${v.impact?.toUpperCase()}] ${v.id}: ${v.help}`)
        for (const n of v.nodes) {
          console.log(`    Target: ${n.target.join(' ')}`)
          console.log(`    HTML: ${n.html.slice(0, 120)}`)
          console.log(`    Failure: ${n.failureSummary}`)
        }
      }
    }
  }

  // Also test QuoteModal open state!
  console.log(`\n========================================`)
  console.log(`Auditing: QuoteModal Open State`)
  console.log(`========================================`)
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` })
  await sleep(1500)
  // Click Free Quote button
  await client.send('Runtime.evaluate', {
    expression: `
      const btn = document.querySelector('.header-cta') || document.querySelector('.outline-btn');
      if (btn) btn.click();
    `,
  })
  await sleep(800)

  // Inject axe & audit
  await client.send('Runtime.evaluate', { expression: axe.source })
  const modalAxeResult = await client.send('Runtime.evaluate', {
    expression: `
      new Promise((resolve) => {
        axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
        }, (err, results) => resolve(err ? { error: err.message } : results));
      })
    `,
    awaitPromise: true,
    returnByValue: true,
  })

  const modalResults = modalAxeResult.result.value
  if (!modalResults.error) {
    console.log(`Passes: ${modalResults.passes.length}`)
    console.log(`Violations: ${modalResults.violations.length}`)
    auditReport.push({
      route: 'QuoteModal Open',
      passes: modalResults.passes.length,
      violations: modalResults.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        nodes: v.nodes.map((n) => ({
          target: n.target.join(' '),
          html: n.html.slice(0, 100),
          failureSummary: n.failureSummary,
        })),
      })),
    })
    for (const v of modalResults.violations) {
      console.log(`\n  [${v.impact?.toUpperCase()}] ${v.id}: ${v.help}`)
      for (const n of v.nodes) {
        console.log(`    Target: ${n.target.join(' ')}`)
        console.log(`    Failure: ${n.failureSummary}`)
      }
    }
  }

  fs.writeFileSync('scripts/initial-audit-report.json', JSON.stringify(auditReport, null, 2))
  console.log('\nReport saved to scripts/initial-audit-report.json')

  client.close()
  chromeProcess.kill()
  server.close()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
