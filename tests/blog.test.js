import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import sharp from 'sharp'
import { createRequestHandler } from '../server.js'
import { SERVICES } from '../src/data/services.ts'

const contentDirectory = new URL('../src/content/', import.meta.url)
const dist = new URL('../dist/', import.meta.url)
const serviceIds = new Set(SERVICES.map(({ id }) => id))
const filenames = await readdir(contentDirectory)
const articles = (await Promise.all(
  filenames.filter((name) => /^blog-.+\.json$/.test(name)).map(async (name) =>
    JSON.parse(await readFile(new URL(name, contentDirectory), 'utf8')),
  ),
)).flat()
const indexPath = '/blog'
const articlePaths = articles.map((article) => `${indexPath}/${article.slug}`)

test('published blog routes serve crawlable content, unique metadata and valid local links', {
  skip: !existsSync(new URL('index.html', dist)) && 'Run npm run build to generate the production HTML.',
}, async (t) => {
  assert.ok(articles.length >= 10)
  assert.equal(new Set(articlePaths).size, articlePaths.length)

  const server = createServer(createRequestHandler())
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  t.after(() => new Promise((resolve) => server.close(resolve)))

  const origin = `http://127.0.0.1:${server.address().port}`
  const paths = [indexPath, ...articlePaths]
  const titles = new Set()
  const descriptions = new Set()

  for (const [index, path] of paths.entries()) {
    await t.test(path, async () => {
      const response = await fetch(`${origin}${path}?utm_source=qa`, { redirect: 'manual' })
      assert.equal(response.status, 200)
      const html = await response.text()
      const { window } = new JSDOM(html)
      try {
        const { document } = window
        const canonical = document.querySelector('link[rel="canonical"]').getAttribute('href')
        assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1)
        assert.equal(new URL(canonical).pathname, path)
        assert.equal(new URL(canonical).search, '')
        assert.match(document.querySelector('meta[name="robots"]').content, /^index, follow/)

        const heading = document.querySelector('main h1')
        assert.equal(document.querySelectorAll('main h1').length, 1)
        assert.equal(heading.textContent, articles[index - 1]?.title ?? 'Commercial Roofing Blog')

        const description = document.querySelector('meta[name="description"]').content
        assert.ok(document.title && description)
        assert.ok(!titles.has(document.title), `Duplicate title on ${path}`)
        assert.ok(!descriptions.has(description), `Duplicate description on ${path}`)
        titles.add(document.title)
        descriptions.add(description)

        const og = (key) => document.querySelector(`meta[property="og:${key}"]`).content
        assert.equal(og('title'), document.title)
        assert.equal(og('description'), description)
        assert.equal(og('url'), canonical)
        assert.ok(og('image:alt'))
        const socialImage = new URL(og('image'))
        assert.equal(socialImage.origin, new URL(canonical).origin)
        const socialMetadata = await sharp(await readFile(new URL(socialImage.pathname.slice(1), dist))).metadata()
        assert.equal(socialMetadata.width, Number(og('image:width')))
        assert.equal(socialMetadata.height, Number(og('image:height')))
        assert.equal(socialMetadata.format, 'jpeg')

        const businessSchema = [...document.querySelectorAll('script[type="application/ld+json"]')]
          .map((script) => JSON.parse(script.textContent))
          .find((node) => node['@type'] === 'RoofingContractor')
        assert.ok(businessSchema?.['@id'])
        const data = JSON.parse(document.getElementById('page-structured-data').textContent)
        assert.equal(data['@context'], 'https://schema.org')
        assert.ok(data['@graph'].some((node) => node['@type'] === 'Blog'))
        assert.ok(!data['@graph'].some((node) => node['@type'] === 'FAQPage'))

        const crumbs = data['@graph'].find((node) => node['@type'] === 'BreadcrumbList').itemListElement
        const visibleCrumbs = [...document.querySelectorAll('nav[aria-label="Breadcrumb"] li')].map((item) => item.textContent)
        assert.deepEqual(crumbs.map((crumb) => crumb.name), visibleCrumbs)
        assert.equal(crumbs.at(-1).item, canonical)

        const main = document.querySelector('main')
        const links = [...main.querySelectorAll('a[href]')].map((link) => new URL(link.getAttribute('href'), canonical))
        for (const link of links) {
          if (link.origin !== new URL(canonical).origin) {
            assert.equal(link.protocol, 'https:')
          } else if (link.pathname.startsWith('/blog')) {
            assert.ok(paths.includes(link.pathname), `Unknown blog route ${link.pathname}`)
          } else if (link.pathname.startsWith('/service/')) {
            assert.ok(!link.search && serviceIds.has(link.pathname.slice('/service/'.length)), `Unknown service ${link.href}`)
          }
        }
        for (const image of main.querySelectorAll('img')) {
          assert.ok(image.alt.trim())
          assert.ok(Number(image.getAttribute('width')) > 0)
          assert.ok(Number(image.getAttribute('height')) > 0)
          assert.ok((await stat(new URL(image.getAttribute('src').slice(1), dist))).isFile())
        }

        if (index === 0) {
          assert.equal(og('type'), 'website')
          for (const articlePath of articlePaths) assert.ok(links.some((link) => link.pathname === articlePath))
        } else {
          assert.equal(og('type'), 'article')
          const posting = data['@graph'].find((node) => node['@type'] === 'BlogPosting')
          assert.equal(posting.mainEntityOfPage, canonical)
          assert.equal(posting.headline, heading.textContent)
          assert.equal(posting.description, main.querySelector('.blog-answer').textContent)
          assert.equal(posting.datePublished, main.querySelector('time').dateTime)
          assert.equal(posting.author.name, businessSchema.name)
          assert.equal(posting.publisher['@id'], businessSchema['@id'])
          assert.ok(links.some((link) => link.pathname === '/contact'))
          assert.ok(links.some((link) => link.pathname.startsWith('/service/')))
          assert.ok(links.some((link) => link.pathname.startsWith('/blog/')))
        }
      } finally {
        window.close()
      }
    })
  }

  const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text()
  const { window } = new JSDOM(sitemap, { contentType: 'text/xml' })
  const sitemapPaths = [...window.document.querySelectorAll('url > loc')]
    .map((entry) => new URL(entry.textContent).pathname)
    .filter((path) => path.startsWith('/blog'))
  assert.deepEqual([...sitemapPaths].sort(), [...paths].sort())
  window.close()

  const robots = await (await fetch(`${origin}/robots.txt`)).text()
  assert.match(robots, /User-agent: OAI-SearchBot\r?\nAllow: \//)
  const missing = await fetch(`${origin}/blog/no-such-article`)
  assert.equal(missing.status, 404)
  assert.match(await missing.text(), /<meta[^>]*name="robots"[^>]*content="noindex/)
  const fileAlias = await fetch(`${origin}${articlePaths[0]}.html`, { redirect: 'manual' })
  assert.equal(fileAlias.status, 301)
  assert.equal(fileAlias.headers.get('location'), articlePaths[0])
})
