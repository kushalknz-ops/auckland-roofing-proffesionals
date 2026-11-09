import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.resolve(projectRoot, 'public')
const publicAssetsDir = path.resolve(publicDir, 'assets')

test('Favicon & App Icon File Integrity', async (t) => {
  await t.test('All required favicon and app icon files exist and are non-empty', () => {
    const requiredFiles = [
      path.join(publicDir, 'favicon.ico'),
      path.join(publicDir, 'favicon.svg'),
      path.join(publicDir, 'apple-touch-icon.png'),
      path.join(publicDir, 'site.webmanifest'),
      path.join(publicAssetsDir, 'favicon.ico'),
      path.join(publicAssetsDir, 'favicon.svg'),
      path.join(publicAssetsDir, 'favicon.png'),
      path.join(publicAssetsDir, 'favicon-16x16.png'),
      path.join(publicAssetsDir, 'favicon-32x32.png'),
      path.join(publicAssetsDir, 'favicon-48x48.png'),
      path.join(publicAssetsDir, 'apple-touch-icon.png'),
      path.join(publicAssetsDir, 'android-chrome-192x192.png'),
      path.join(publicAssetsDir, 'android-chrome-512x512.png'),
      path.join(publicAssetsDir, 'android-chrome-maskable-512x512.png'),
    ]

    for (const filePath of requiredFiles) {
      assert.ok(fs.existsSync(filePath), `File does not exist: ${path.relative(projectRoot, filePath)}`)
      const stat = fs.statSync(filePath)
      assert.ok(stat.size > 0, `File is empty: ${path.relative(projectRoot, filePath)}`)
    }
  })

  await t.test('favicon.ico has valid ICO format header and multiple embedded resolutions', () => {
    const icoBuf = fs.readFileSync(path.join(publicDir, 'favicon.ico'))
    // ICO header: 2 bytes reserved (0), 2 bytes type (1 = icon), 2 bytes count (3)
    assert.equal(icoBuf.readUInt16LE(0), 0, 'ICO reserved byte must be 0')
    assert.equal(icoBuf.readUInt16LE(2), 1, 'ICO type must be 1 (icon)')
    const iconCount = icoBuf.readUInt16LE(4)
    assert.ok(iconCount >= 3, `Expected at least 3 embedded sizes in ICO, got ${iconCount}`)

    // Check directory entries (16 bytes each)
    const sizes = []
    for (let i = 0; i < iconCount; i++) {
      const offset = 6 + i * 16
      const w = icoBuf.readUInt8(offset)
      const h = icoBuf.readUInt8(offset + 1)
      sizes.push({ width: w === 0 ? 256 : w, height: h === 0 ? 256 : h })
    }

    assert.ok(sizes.some((s) => s.width === 16 && s.height === 16), 'ICO missing 16x16 size')
    assert.ok(sizes.some((s) => s.width === 32 && s.height === 32), 'ICO missing 32x32 size')
    assert.ok(sizes.some((s) => s.width === 48 && s.height === 48), 'ICO missing 48x48 size')
  })

  await t.test('favicon.svg is well-formed vector XML with Auckland Roof Professionals elements', () => {
    const svgPath = path.join(publicAssetsDir, 'favicon.svg')
    const svgContent = fs.readFileSync(svgPath, 'utf8')
    assert.ok(svgContent.includes('<svg'), 'SVG file must contain <svg> root element')
    assert.ok(svgContent.includes('viewBox="0 0 512 512"'), 'SVG must specify 512x512 viewBox')
    assert.ok(svgContent.includes('xmlns="http://www.w3.org/2000/svg"'), 'SVG must include xml namespace')
    assert.ok(svgContent.includes('#2C3533'), 'SVG must use brand Coastal Charcoal')
    assert.ok(svgContent.includes('#A5B8AC'), 'SVG must use brand Sage accent')
  })

  await t.test('PNG image dimensions match their standard specifications', async () => {
    const expectations = [
      { file: path.join(publicAssetsDir, 'favicon-16x16.png'), expectedW: 16, expectedH: 16 },
      { file: path.join(publicAssetsDir, 'favicon-32x32.png'), expectedW: 32, expectedH: 32 },
      { file: path.join(publicAssetsDir, 'favicon-48x48.png'), expectedW: 48, expectedH: 48 },
      { file: path.join(publicAssetsDir, 'favicon.png'), expectedW: 64, expectedH: 64 },
      { file: path.join(publicAssetsDir, 'apple-touch-icon.png'), expectedW: 180, expectedH: 180 },
      { file: path.join(publicAssetsDir, 'android-chrome-192x192.png'), expectedW: 192, expectedH: 192 },
      { file: path.join(publicAssetsDir, 'android-chrome-512x512.png'), expectedW: 512, expectedH: 512 },
      { file: path.join(publicAssetsDir, 'android-chrome-maskable-512x512.png'), expectedW: 512, expectedH: 512 },
    ]

    for (const { file, expectedW, expectedH } of expectations) {
      const meta = await sharp(file).metadata()
      assert.equal(meta.width, expectedW, `${path.basename(file)} width mismatch`)
      assert.equal(meta.height, expectedH, `${path.basename(file)} height mismatch`)
      assert.equal(meta.format, 'png', `${path.basename(file)} must be PNG format`)
    }
  })

  await t.test('site.webmanifest is valid JSON and declares ARP branding and icons', () => {
    const manifestPath = path.join(publicDir, 'site.webmanifest')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    assert.equal(manifest.name, 'Auckland Roof Professionals')
    assert.equal(manifest.theme_color, '#2C3533')
    assert.equal(manifest.background_color, '#2C3533')
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Manifest must declare icons')
    for (const icon of manifest.icons) {
      const { pathname } = new URL(icon.src, 'https://example.test')
      const assetPath = path.join(publicDir, pathname)
      assert.ok(fs.existsSync(assetPath), `Manifest icon file missing: ${icon.src}`)
    }
    const maskable = manifest.icons.find(icon => icon.purpose === 'maskable')
    assert.ok(maskable, 'Manifest must declare a maskable icon')
    assert.equal(maskable.sizes, '512x512')
    assert.ok(manifest.icons.every(icon => icon === maskable || icon.src !== maskable.src))
  })

  for (const page of ['index.html', 'public/404.html', 'public/social-preview.html']) {
    await t.test(`${page} declares the brand icons and theme color`, () => {
      const html = fs.readFileSync(path.join(projectRoot, page), 'utf8')
      const { window } = new JSDOM(html, { url: 'https://example.test' })
      const { head } = window.document
      const icons = [...head.querySelectorAll('link[rel="icon"]')]
      assert.deepEqual(icons.map(link => [new URL(link.href).pathname, link.getAttribute('sizes')]), [
        ['/favicon.ico', '16x16 32x32 48x48'],
        ['/assets/favicon-16x16.png', '16x16'],
        ['/assets/favicon-32x32.png', '32x32'],
        ['/assets/favicon.svg', 'any'],
      ])
      const touchIcon = head.querySelector('link[rel="apple-touch-icon"][sizes="180x180"]')
      assert.equal(new URL(touchIcon.href).pathname, '/assets/apple-touch-icon.png')
      assert.equal(new URL(head.querySelector('link[rel="manifest"]').href).pathname, '/site.webmanifest')
      assert.equal(head.querySelector('meta[name="theme-color"]').content, '#2C3533')
      window.close()
    })
  }
})
