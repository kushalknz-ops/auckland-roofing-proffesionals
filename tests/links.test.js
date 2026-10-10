/**
 * Link Integrity & Routing Test Suite
 * Auckland Roof Professionals
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SERVICES } from '../src/data/services.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const srcDir = path.resolve(projectRoot, 'src')
const publicDir = path.resolve(projectRoot, 'public')

test('Link Integrity - Services Catalogue Slugs', async (t) => {
  await t.test('all services have valid non-empty IDs matching URL slug pattern', () => {
    assert.ok(SERVICES.length > 0)
    for (const s of SERVICES) {
      assert.ok(s.id, 'Service must have an id')
      assert.match(s.id, /^[a-z0-9-]+$/, `Service ID "${s.id}" must be kebab-case slug`)
      assert.ok(s.title, `Service "${s.id}" must have a title`)
      assert.ok(s.img, `Service "${s.id}" must have an image path`)
    }
  })

  await t.test('sitemap.xml only references existing service IDs and routes', () => {
    const sitemapContent = fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf8')
    const serviceLocRegex = /<loc>https:\/\/aucklandroofprofessionals\.nz\/service\?id=([^<]+)<\/loc>/g
    let match
    const sitemapServiceIds = []
    while ((match = serviceLocRegex.exec(sitemapContent)) !== null) {
      sitemapServiceIds.push(match[1])
    }

    assert.equal(sitemapServiceIds.length, SERVICES.length, 'Sitemap should contain all catalog services')
    for (const id of sitemapServiceIds) {
      const found = SERVICES.find((s) => s.id === id)
      assert.ok(found, `Sitemap service ID "${id}" does not exist in catalog`)
    }
  })

  await t.test('404.html static links only reference existing service IDs and routes', () => {
    const html404 = fs.readFileSync(path.join(publicDir, '404.html'), 'utf8')
    const serviceLinkRegex = /href="\/service\?id=([^"&]+)"/g
    let match
    while ((match = serviceLinkRegex.exec(html404)) !== null) {
      const id = match[1]
      const found = SERVICES.find((s) => s.id === id)
      assert.ok(found, `404.html service link "${id}" does not exist in catalog`)
    }
  })
})

test('Link Integrity - Internal Anchor IDs & DOM Targets', async (t) => {
  await t.test('all hash anchors referenced in Header and Footer exist on HomePage', () => {
    const homeContent = fs.readFileSync(path.join(srcDir, 'pages', 'HomePage.tsx'), 'utf8')
    const requiredIds = ['services', 'projects', 'process', 'about', 'faq', 'contact', 'service-grid']

    for (const id of requiredIds) {
      const hasId =
        homeContent.includes(`id="${id}"`) ||
        homeContent.includes(`id='${id}'`)
      assert.ok(hasId, `HomePage is missing DOM element with id="${id}"`)
    }
  })

  await t.test('CategoryPage contains svcList anchor target', () => {
    const catContent = fs.readFileSync(path.join(srcDir, 'pages', 'CategoryPage.tsx'), 'utf8')
    assert.ok(catContent.includes('id="svcList"'), 'CategoryPage must contain id="svcList"')
  })
})

test('Link Integrity - No Placeholder or Dead "#" Links', async (t) => {
  await t.test('source components do not contain unhandled <a href="#"> dead links', () => {
    function getComponentFiles(dir) {
      let files = []
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item)
        if (fs.statSync(full).isDirectory()) {
          files = files.concat(getComponentFiles(full))
        } else if (item.endsWith('.tsx')) {
          files.push(full)
        }
      }
      return files
    }

    const tsxFiles = getComponentFiles(srcDir)
    const deadLinks = []

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf8')
      const matches = content.match(/<a\s+[^>]*href=["']#["'][^>]*>/g)
      if (matches) {
        deadLinks.push({ file: path.relative(projectRoot, file), matches })
      }
    }

    assert.deepEqual(deadLinks, [], 'Found broken <a href="#"> links in TSX files')
  })
})

test('Link Integrity - Public Static Asset References', async (t) => {
  await t.test('all /assets/ referenced in code, data, and sitemap exist in public directory', () => {
    const filesToCheck = [
      path.join(srcDir, 'data', 'services.ts'),
      path.join(srcDir, 'pages', 'HomePage.tsx'),
      path.join(srcDir, 'pages', 'CategoryPage.tsx'),
      path.join(srcDir, 'pages', 'ServicePage.tsx'),
      path.join(srcDir, 'pages', 'ContactPage.tsx'),
      path.join(srcDir, 'components', 'site', 'Header.tsx'),
      path.join(srcDir, 'components', 'site', 'Footer.tsx'),
      path.join(publicDir, 'sitemap.xml'),
      path.join(publicDir, '404.html'),
      path.join(projectRoot, 'index.html'),
    ]

    const assetRegex = /['"](\/assets\/[^'"\s]+)['"]/g
    const missing = []

    for (const file of filesToCheck) {
      if (!fs.existsSync(file)) continue
      const content = fs.readFileSync(file, 'utf8')
      let match
      while ((match = assetRegex.exec(content)) !== null) {
        const relAsset = match[1].replace(/^\//, '')
        const fullAssetPath = path.join(publicDir, relAsset)
        if (!fs.existsSync(fullAssetPath)) {
          missing.push({ file: path.relative(projectRoot, file), asset: match[1] })
        }
      }
    }

    assert.deepEqual(missing, [], 'Found missing static asset references')
  })
})

test('Link Integrity - Communication Protocols (tel and mailto)', async () => {
  const filesToCheck = [
    path.join(srcDir, 'components', 'site', 'Footer.tsx'),
    path.join(srcDir, 'components', 'site', 'QuoteModal.tsx'),
    path.join(srcDir, 'components', 'site', 'RoofingEnquiryForm.tsx'),
    path.join(srcDir, 'pages', 'HomePage.tsx'),
    path.join(srcDir, 'pages', 'ContactPage.tsx'),
    path.join(srcDir, 'pages', 'NotFoundPage.tsx'),
    path.join(publicDir, '404.html'),
  ]

  for (const file of filesToCheck) {
    if (!fs.existsSync(file)) continue
    const content = fs.readFileSync(file, 'utf8')

    // Check tel: links
    const telMatches = content.match(/href=["'](tel:[^"']+)["']/g) || []
    for (const tm of telMatches) {
      const tel = tm.replace(/href=["']tel:([^"']+)["']/, '$1')
      assert.match(tel, /^(\+?64)?0?800\d{6}$/, `Invalid tel link format: "${tel}" in ${path.basename(file)}`)
    }

    // Check mailto: links
    const mailMatches = content.match(/href=["'](mailto:[^"']+)["']/g) || []
    for (const mm of mailMatches) {
      const mail = mm.replace(/href=["']mailto:([^"']+)["']/, '$1')
      assert.match(mail, /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, `Invalid mailto link: "${mail}" in ${path.basename(file)}`)
    }
  }
})
