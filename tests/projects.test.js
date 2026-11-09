import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import sharp from 'sharp'
import { createServer as createViteServer } from 'vite'
import { PROJECTS, adjacentProjects, projectPath } from '../src/data/projects.ts'
import { SERVICES } from '../src/data/services.ts'
import { createRequestHandler } from '../server.js'

const dist = new URL('../dist/', import.meta.url)
const chapters = ['overview', 'journey', 'challenges', 'approach', 'experience', 'results']

test('every carousel card links to its own case study', async () => {
  const previewCache = new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url)
  const previewCacheBefore = await readFile(previewCache, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  const vite = await createViteServer({
    // SSR tests must never replace the dependencies served by an open dev preview.
    cacheDir: 'node_modules/.vite-project-tests',
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { renderBlog } = await vite.ssrLoadModule('/src/blog-prerender.tsx')
    const { window } = new JSDOM(await renderBlog('/'))
    try {
      const cards = [...window.document.querySelectorAll('#projects article')]
      assert.equal(PROJECTS.length, 5)
      assert.equal(cards.length, 15, 'Preserve all three carousel sets')
      for (const [index, card] of cards.entries()) {
        const project = PROJECTS[index % PROJECTS.length]
        const link = card.querySelector('a')
        assert.equal(link.getAttribute('href'), projectPath(project))
        assert.ok(link.contains(card.querySelector('img')), 'Image is clickable')
        assert.ok(link.contains(card.querySelector('h3')), 'Title is clickable')
        assert.equal(card.querySelector('h3').textContent, project.title)
      }
    } finally { window.close() }
  } finally { await vite.close() }
  if (previewCacheBefore !== null) {
    assert.equal(await readFile(previewCache, 'utf8'), previewCacheBefore,
      'Rendering project tests must leave the live preview dependency cache unchanged')
  }
})

test('five case studies serve complete, distinct HTML with working navigation and honest content', async (t) => {
  const server = createServer(createRequestHandler())
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const origin = `http://127.0.0.1:${server.address().port}`
  const titles = new Set()
  const descriptions = new Set()

  for (const project of PROJECTS) {
    await t.test(project.title, async () => {
      const pathname = projectPath(project)
      const response = await fetch(`${origin}${pathname}?utm_source=qa`)
      assert.equal(response.status, 200)
      const { window } = new JSDOM(await response.text())
      try {
        const { document } = window
        const main = document.querySelector('main')
        assert.equal(main.querySelectorAll('h1').length, 1)
        assert.equal(main.querySelector('h1').textContent, project.title)
        assert.equal(document.querySelector('#root').dataset.prerenderPath, pathname)
        for (const chapter of chapters) assert.ok(main.querySelector(`#${chapter} h2`), `Missing chapter ${chapter}`)
        assert.equal(main.querySelectorAll('.case-timeline details').length, 6)
        assert.equal(main.querySelectorAll('.case-timeline details[open]').length, 1)
        assert.match(main.querySelector('#journey').textContent, /stage dates and detailed records are awaiting confirmation/)
        assert.match(main.querySelector('#experience').textContent, /No attributable feedback/)
        assert.equal(main.querySelectorAll('blockquote').length, 0, 'No invented testimonials')
        assert.ok(main.querySelector('#results .case-pending'))
        if (project.imageKind === 'representative') assert.match(main.querySelector('.case-hero-image figcaption').textContent, /Representative service image/)

        const canonical = document.querySelector('link[rel="canonical"]').href
        assert.equal(new URL(canonical).pathname, pathname)
        assert.equal(new URL(canonical).search, '')
        assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1)
        assert.ok(!titles.has(document.title), 'Unique page title')
        titles.add(document.title)
        const description = document.querySelector('meta[name="description"]').content
        assert.ok(!descriptions.has(description), 'Unique description')
        descriptions.add(description)
        const meta = (property) => document.querySelector(`meta[property="${property}"]`).content
        assert.equal(meta('og:url'), canonical)
        assert.equal(meta('og:title'), document.title)
        assert.equal(meta('og:image:type'), 'image/jpeg')
        const imageFile = new URL(meta('og:image')).pathname.slice(1)
        if (project.imageKind === 'portfolio') {
          assert.equal(meta('og:image:alt'), project.alt)
          assert.match(imageFile, new RegExp(`^assets/social/project-${project.slug}-`))
        } else {
          assert.match(imageFile, /^assets\/social\/roofing-/)
        }
        const imageMeta = await sharp(fileURLToPath(new URL(imageFile, dist))).metadata()
        assert.equal(Number(meta('og:image:width')), imageMeta.width)
        assert.equal(Number(meta('og:image:height')), imageMeta.height)
        const schema = JSON.parse(document.querySelector('#page-structured-data').textContent)
        assert.ok(schema['@graph'].some((node) => node['@type'] === 'BreadcrumbList'))
        assert.ok(!JSON.stringify(schema).includes('Review'), 'No fabricated review schema')

        const { previous, next } = adjacentProjects(project)
        assert.equal(main.querySelector('[rel="prev"]').getAttribute('href'), projectPath(previous))
        assert.equal(main.querySelector('[rel="next"]').getAttribute('href'), projectPath(next))
        assert.ok(main.querySelector('a[href="/#projects"]'))
        assert.ok(main.querySelector('.case-cta button'))
        for (const link of main.querySelectorAll('a')) {
          const href = link.getAttribute('href')
          if (href.startsWith('#')) assert.ok(document.getElementById(href.slice(1)), `Missing anchor ${href}`)
          if (href.startsWith('/projects/')) assert.ok(PROJECTS.some((entry) => projectPath(entry) === href))
          if (href.startsWith('/service?')) assert.ok(SERVICES.some(({ id }) => id === new URL(href, origin).searchParams.get('id')))
        }
        for (const image of main.querySelectorAll('img')) {
          assert.ok(image.alt)
          assert.ok(Number(image.getAttribute('width')) > 0)
          assert.ok(Number(image.getAttribute('height')) > 0)
          assert.ok((await stat(new URL(image.getAttribute('src').slice(1), dist))).isFile())
        }
      } finally { window.close() }

      const head = await fetch(`${origin}${pathname}`, { method: 'HEAD' })
      assert.equal(head.status, 200)
      assert.equal(await head.text(), '')
      const alias = await fetch(`${origin}${pathname}.html`, { redirect: 'manual' })
      assert.equal(alias.status, 301)
      assert.equal(alias.headers.get('location'), pathname)
    })
  }

  const sitemap = await readFile(new URL('sitemap.xml', dist), 'utf8')
  const { window } = new JSDOM(sitemap, { contentType: 'text/xml' })
  const paths = [...window.document.querySelectorAll('loc')].map((el) => new URL(el.textContent).pathname).filter((path) => path.startsWith('/projects/'))
  assert.deepEqual(paths.sort(), PROJECTS.map(projectPath).sort())
  window.close()
  for (const pathname of ['/projects/not-a-project', '/projects/albany-commercial-centre/extra']) {
    const response = await fetch(`${origin}${pathname}`)
    assert.equal(response.status, 404)
    assert.match(await response.text(), /<meta[^>]*name="robots"[^>]*content="noindex/)
  }
})
