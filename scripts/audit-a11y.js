import { JSDOM } from 'jsdom'
import axe from 'axe-core'
import fs from 'node:fs'
import path from 'node:path'

// Helper to run axe-core on an HTML string
export async function auditHtml(html, pageName = 'Page') {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://aucklandroofprofessionals.nz/',
  })

  // Inject axe into JSDOM window
  dom.window.eval(axe.source)

  const results = await dom.window.axe.run(dom.window.document, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    },
  })

  return {
    pageName,
    violations: results.violations,
    passes: results.passes.length,
    incomplete: results.incomplete,
  }
}

async function run() {
  console.log('Running axe-core accessibility audit on static output...')
  const distHtmlPath = path.resolve('dist/index.html')
  if (fs.existsSync(distHtmlPath)) {
    const html = fs.readFileSync(distHtmlPath, 'utf8')
    const res = await auditHtml(html, 'dist/index.html')
    console.log(`Audited ${res.pageName}:`)
    console.log(`  Passes: ${res.passes}`)
    console.log(`  Violations: ${res.violations.length}`)
    for (const v of res.violations) {
      console.log(`    [${v.impact}] ${v.id}: ${v.help}`)
      for (const node of v.nodes) {
        console.log(`      Target: ${node.target}`)
        console.log(`      Failure summary: ${node.failureSummary}`)
      }
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('audit-a11y.js')) {
  run().catch(console.error)
}
