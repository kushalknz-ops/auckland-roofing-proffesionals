import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.resolve(projectRoot, 'public')
const publicAssetsDir = path.resolve(publicDir, 'assets')
const assetsDir = path.resolve(projectRoot, 'assets')

function buildSvg() {
  const scale = 1.12
  const targetCx = 256
  const targetCy = 252
  const origCx = 170
  const origCy = 169.5

  function pt(x, y) {
    const nx = targetCx + (x - origCx) * scale
    const ny = targetCy + (y - origCy) * scale
    return `${nx.toFixed(2)},${ny.toFixed(2)}`
  }

  // Exact brand gable chevrons
  const topChevron = `M ${pt(170, 45)} L ${pt(328, 188)} L ${pt(312, 203)} L ${pt(170, 77.5)} L ${pt(28, 203)} L ${pt(12, 188)} Z`
  const innerChevron = `M ${pt(170, 124)} L ${pt(259, 204)} L ${pt(242, 219)} L ${pt(170, 156.5)} L ${pt(98, 219)} L ${pt(81, 204)} Z`

  const bX = targetCx + (92 - origCx) * scale
  const bY = targetCy + (271 - origCy) * scale
  const bW = (248 - 92) * scale
  const bH = (294 - 271) * scale
  const bRadius = 5 * scale

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="arpBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#35403D" />
      <stop offset="100%" stop-color="#1B2220" />
    </linearGradient>
    <linearGradient id="arpSage" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C4D6C9" />
      <stop offset="100%" stop-color="#9CB3A3" />
    </linearGradient>
    <filter id="arpShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Coastal Charcoal Squircle Badge -->
  <rect width="512" height="512" rx="116" fill="url(#arpBg)" />
  <rect x="6" y="6" width="500" height="500" rx="110" fill="none" stroke="#4F605C" stroke-width="8" stroke-opacity="0.5" />

  <g filter="url(#arpShadow)">
    <!-- Top Roof Gable — Sage Accent -->
    <path d="${topChevron}" fill="url(#arpSage)" />

    <!-- Inner Roof Gable — Pure Cloud White -->
    <path d="${innerChevron}" fill="#FFFFFF" />

    <!-- Foundation Beam — Sage Accent -->
    <rect x="${bX.toFixed(2)}" y="${bY.toFixed(2)}" width="${bW.toFixed(2)}" height="${bH.toFixed(2)}" rx="${bRadius.toFixed(2)}" fill="url(#arpSage)" />
  </g>
</svg>`
}

/**
 * Packs multiple PNG buffers into standard Windows ICO format
 */
function createIco(pngBuffers, sizes) {
  const count = pngBuffers.length
  const headerSize = 6
  const dirEntrySize = 16
  const dataOffsetStart = headerSize + dirEntrySize * count

  let currentOffset = dataOffsetStart
  const dirEntries = []

  for (let i = 0; i < count; i++) {
    const size = sizes[i]
    const buf = pngBuffers[i]
    const width = size >= 256 ? 0 : size
    const height = size >= 256 ? 0 : size

    const entry = Buffer.alloc(16)
    entry.writeUInt8(width, 0)
    entry.writeUInt8(height, 1)
    entry.writeUInt8(0, 2) // color count
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(buf.length, 8) // image size
    entry.writeUInt32LE(currentOffset, 12) // offset
    dirEntries.push(entry)

    currentOffset += buf.length
  }

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type 1 = icon
  header.writeUInt16LE(count, 4) // count

  return Buffer.concat([header, ...dirEntries, ...pngBuffers])
}

async function generateAll() {
  const svgContent = buildSvg()
  const svgBuf = Buffer.from(svgContent)

  // 1. Save SVG favicon to public/assets/favicon.svg and public/favicon.svg
  fs.writeFileSync(path.join(publicAssetsDir, 'favicon.svg'), svgContent, 'utf8')
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8')
  fs.writeFileSync(path.join(assetsDir, 'favicon.svg'), svgContent, 'utf8')

  // 2. Generate PNGs at various resolutions
  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'favicon.png', size: 64 }, // Legacy 64x64
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
  ]

  const pngMap = {}

  for (const { name, size } of sizes) {
    const pngBuf = await sharp(svgBuf).resize(size, size).png().toBuffer()
    pngMap[size] = pngBuf

    // Write to public/assets/
    fs.writeFileSync(path.join(publicAssetsDir, name), pngBuf)
    // Mirror to assets/
    fs.writeFileSync(path.join(assetsDir, name), pngBuf)

    // For apple-touch-icon and android-chrome, also put in root public/
    if (name === 'apple-touch-icon.png') {
      fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuf)
    }
  }

  // 3. Generate multi-resolution ICO file (16, 32, 48)
  const icoBuf = createIco(
    [pngMap[16], pngMap[32], pngMap[48]],
    [16, 32, 48]
  )

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf)
  fs.writeFileSync(path.join(publicAssetsDir, 'favicon.ico'), icoBuf)
  fs.writeFileSync(path.join(assetsDir, 'favicon.ico'), icoBuf)

  // 4. Create site.webmanifest
  const manifest = {
    name: 'Auckland Roof Professionals',
    short_name: 'ARP Roofing',
    description: 'Auckland commercial and residential roofing specialists with 10-year warranty.',
    start_url: '/',
    display: 'standalone',
    background_color: '#2C3533',
    theme_color: '#2C3533',
    icons: [
      {
        src: '/assets/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/assets/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/assets/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }

  const manifestStr = JSON.stringify(manifest, null, 2)
  fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), manifestStr, 'utf8')

  console.log('Successfully generated all favicons, ICO, SVG, and webmanifest!')
}

generateAll().catch(err => {
  console.error('Error generating favicons:', err)
  process.exit(1)
})
