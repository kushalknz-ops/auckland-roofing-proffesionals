import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { createServer } from 'vite'

const dist = path.resolve('dist')
const manifestPath = path.join(dist, '.vite/manifest.json')
const template = await readFile(path.join(dist, 'index.html'), 'utf8')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const blogEntry = manifest['src/pages/BlogPage.tsx']
if (!blogEntry?.css?.length) throw new Error('Blog stylesheet missing from Vite build manifest')
const projectEntry = manifest['src/pages/ProjectPage.tsx']
if (!projectEntry?.css?.length) throw new Error('Project stylesheet missing from Vite build manifest')

const escape = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

function renderSocialTags(html, tags) {
  const markup = Object.entries(tags).map(([name, value]) => {
    const attr = name.startsWith('og:') ? 'property' : 'name'
    return `  <meta ${attr}="${name}" content="${escape(value)}" />\n`
  }).join('')
  return html.replace(/^[ \t]*<meta (?:property|name)="(?:og|twitter):[^"]+"[^>]*>\r?\n/gm, '')
    .replace('</head>', () => markup + '</head>')
}

function renderPage({ pathname, content, meta, canonical, entry, source = template, socialTags }) {
  const attributes = {
    'name="description"': meta.description,
    'name="robots"': meta.noIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
  }
  let html = renderSocialTags(source, socialTags)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escape(meta.title)}</title>`)
    .replace(/\s*<meta name="keywords"[^>]*>/, () => (
      meta.keywords ? `\n  <meta name="keywords" content="${escape(meta.keywords)}" />` : ''
    ))
  if (pathname !== '/') {
    html = html.replace(/\s*<!-- homepage-resources:start -->[\s\S]*?<!-- homepage-resources:end -->/, '')
  }
  if (canonical) {
    html = html.replace('</head>', () => `  <link rel="canonical" href="${escape(canonical)}" />\n</head>`)
  }

  for (const [attribute, value] of Object.entries(attributes)) {
    const pattern = new RegExp(`<meta ${attribute}[^>]*>`)
    const tag = `<meta ${attribute} content="${escape(value)}" />`
    if (!pattern.test(html)) throw new Error(`Missing ${attribute} in the template for ${pathname}`)
    html = html.replace(pattern, () => tag)
  }

  if (!entry) {
    return pathname === '/' ? html : html.replace(/\s*<div class="site-shell-poster"><\/div>/, '')
  }
  const styles = entry.css.map((file) => `<link rel="stylesheet" href="/${escape(file)}" />`)
  const head = [
    ...styles,
    `<link rel="modulepreload" href="/${escape(entry.file)}" />`,
    `<script id="page-structured-data" type="application/ld+json">${meta.structuredData}</script>`,
  ]
  const start = html.indexOf('<div id="root">')
  const end = html.indexOf('</body>', start)
  if (start === -1 || end === -1) throw new Error('Prerender template is missing the application root')
  return (html.slice(0, start)
    + `<div id="root" data-prerender-path="${escape(pathname)}">${content}</div>\n`
    + html.slice(end)).replace('</head>', () => `  ${head.join('\n  ')}\n</head>`)
}

function sitemapEntry(canonical, lastModified, image) {
  if (lastModified !== undefined && (
    !/^\d{4}-\d{2}-\d{2}$/.test(lastModified) || !Number.isFinite(Date.parse(lastModified)) ||
    new Date(lastModified).toISOString().slice(0, 10) !== lastModified
  )) {
    throw new Error(`Invalid sitemap lastModified date for ${canonical}: ${lastModified}`)
  }
  return [
    '  <url>',
    `    <loc>${escape(canonical)}</loc>`,
    ...(lastModified ? [`    <lastmod>${escape(lastModified)}</lastmod>`] : []),
    ...(image ? [
      '    <image:image>',
      `      <image:loc>${escape(new URL(image, canonical).href)}</image:loc>`,
      '    </image:image>',
    ] : []),
    '  </url>',
  ].join('\n')
}

// Vite loads the same TSX and aliases as the browser build. No SSR server is shipped.
process.env.NODE_ENV ||= 'production'
const vite = await createServer({
  mode: 'production',
  // Keep production prerendering from invalidating a running dev server's dependencies.
  cacheDir: 'node_modules/.vite-prerender',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true, hmr: false, watch: null },
})
try {
  const {
    articles, getBlogSEO, PROJECTS, getProjectSEO, SERVICES, getServiceSEO, pageSEO,
    normalizeCanonicalUrl, renderBlog, getSocialTags, socialPreviewSEO,
  } = await vite.ssrLoadModule('/src/blog-prerender.tsx')
  const origin = new URL(normalizeCanonicalUrl('/')).origin
  const landingImages = {
    '/': '/assets/landing-video-poster.webp',
    '/commercial': '/assets/img/audience-business.webp',
    '/residential': '/assets/img/audience-home.webp',
  }
  const pages = [
    ...Object.entries(pageSEO).map(([pathname, meta]) => ({ pathname, meta, image: landingImages[pathname] })),
    ...SERVICES.map((service) => ({
      pathname: `/service/${service.id}`, meta: getServiceSEO(service), image: service.img,
    })),
    { pathname: '/service-default', meta: getServiceSEO(SERVICES[0]), alias: true },
    { pathname: '/service-not-found', meta: getServiceSEO(), alias: true },
    ...[undefined, ...articles].map((article) => {
      const meta = getBlogSEO(article)
      return { pathname: meta.canonical, meta, image: article?.image.src, entry: blogEntry }
    }),
    ...PROJECTS.map((project) => {
      const meta = getProjectSEO(project)
      return { pathname: meta.canonical, meta, image: project.img, entry: projectEntry }
    }),
  ]
  const entries = []
  const titles = new Set()
  const descriptions = new Set()
  const outputPaths = new Set()
  const checkedImages = new Set()

  for (const { pathname, meta, image, entry, alias } of pages) {
    if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(pathname) || outputPaths.has(pathname)) {
      throw new Error(`Invalid or duplicate page path: ${pathname}`)
    }
    outputPaths.add(pathname)
    if (!meta.title?.trim() || !meta.description?.trim() ||
        (!alias && (titles.has(meta.title) || descriptions.has(meta.description)))) {
      throw new Error(`Missing or duplicate SEO metadata for ${pathname}`)
    }
    titles.add(meta.title)
    descriptions.add(meta.description)

    const canonical = meta.noIndex ? undefined : normalizeCanonicalUrl(meta.canonical)
    const socialTags = getSocialTags(meta, canonical ?? normalizeCanonicalUrl(meta.canonical ?? pathname))
    const imageUrl = new URL(socialTags['og:image'])
    if (imageUrl.protocol !== 'https:' || !/^\/assets\/[a-z0-9/-]+\.jpg$/.test(imageUrl.pathname)) {
      throw new Error(`Invalid social preview image URL for ${pathname}: ${imageUrl.href}`)
    }
    if (!checkedImages.has(imageUrl.pathname)) {
      const bytes = await readFile(path.join(dist, imageUrl.pathname.slice(1)))
      const { format, width, height } = await sharp(bytes).metadata()
      if (format !== 'jpeg' || String(width) !== socialTags['og:image:width'] ||
          String(height) !== socialTags['og:image:height'] || bytes.length >= 300_000) {
        throw new Error(`Invalid social preview image file: ${imageUrl.pathname}`)
      }
      checkedImages.add(imageUrl.pathname)
    }
    if (canonical && !alias && canonical !== `${origin}${pathname}`) {
      throw new Error(`Expected a self-referencing canonical for ${pathname}, got ${canonical}`)
    }
    const file = path.join(dist, pathname === '/' ? 'index.html' : `${pathname.slice(1)}.html`)
    const source = pathname === '/404' ? await readFile(file, 'utf8') : template
    const content = entry ? await renderBlog(pathname) : undefined
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, renderPage({ pathname, content, meta, canonical, entry, source, socialTags }))
    if (pathname === '/404') {
      // Keep the React error page for SPA routes and the standalone static fallback.
      await writeFile(path.join(dist, '404-app.html'), renderPage({
        pathname, meta, canonical, socialTags,
      }))
    }
    if (canonical && !alias) {
      entries.push(sitemapEntry(canonical, meta.lastModified, image))
    }
  }

  const previewPath = path.join(dist, 'social-preview.html')
  const previewHtml = await readFile(previewPath, 'utf8')
  await writeFile(previewPath, renderSocialTags(
    previewHtml, getSocialTags(socialPreviewSEO, normalizeCanonicalUrl('/social-preview.html')),
  ))

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...entries,
    '</urlset>\n',
  ].join('\n')
  if (!entries.length || entries.length > 50_000 || Buffer.byteLength(sitemap) > 52_428_800) {
    throw new Error('Sitemap must contain 1–50,000 URLs and be at most 50 MB')
  }
  await writeFile(path.join(dist, 'sitemap.xml'), sitemap)
  const robotsPath = path.join(dist, 'robots.txt')
  const robots = await readFile(robotsPath, 'utf8')
  await writeFile(robotsPath, `${robots.replace(/^Sitemap:.*(?:\r?\n|$)/gim, '').trimEnd()}\nSitemap: ${origin}/sitemap.xml\n`)
  // Netlify matches query rules before the generic service rewrite.
  const redirects = SERVICES.map(({ id }) => `/service id=${id} /service/${id} 200`)
  redirects.push('/service id=:id /service-not-found 404', '/service /service-default 200')
  await writeFile(path.join(dist, '_redirects'), `${redirects.join('\n')}\n`)
  console.log(`Wrote metadata for ${pages.length} HTML pages and ${entries.length} canonical URLs to sitemap.xml.`)
} finally {
  await vite.close()
}
