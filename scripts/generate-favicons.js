import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.resolve(projectRoot, 'public')
const publicAssetsDir = path.resolve(publicDir, 'assets')
const assetsDir = path.resolve(projectRoot, 'assets')
const charcoal = '#2C3533'
const cloudWhite = '#F8FAF7'
const sage = '#A5B8AC'
const revision = 'v=2'

function buildSvg({ radius = 104, markScale = 1.28 } = {}) {
  // The two gables and foundation are traced from public/assets/logo-mark.png.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="${radius}" fill="${charcoal}"/>
  <g transform="translate(256 256) scale(${markScale}) translate(-170 -170)">
    <path fill="${cloudWhite}" d="M170 45 328 187 312 205 170 78 28 205 12 187ZM170 124 258 202 242 220 170 157 99 220 83 202Z"/>
    <path fill="${sage}" d="M92 270h157v25H92z"/>
  </g>
</svg>
`
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

  fs.writeFileSync(path.join(publicAssetsDir, 'favicon.svg'), svgContent, 'utf8')
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8')
  fs.writeFileSync(path.join(assetsDir, 'favicon.svg'), svgContent, 'utf8')

  // Let iOS apply its own corners. Android's maskable icon also needs all
  // foreground artwork to fit in the centered circle with radius 40%.
  const touchSvg = Buffer.from(buildSvg({ radius: 0 }))
  const maskableSvg = Buffer.from(buildSvg({ radius: 0, markScale: 1.15 }))
  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'favicon.png', size: 64 }, // Legacy 64x64
    { name: 'apple-touch-icon.png', size: 180, source: touchSvg },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
    { name: 'android-chrome-maskable-512x512.png', size: 512, source: maskableSvg },
  ]

  const pngMap = {}

  for (const { name, size, source = svgBuf } of sizes) {
    const pngBuf = await sharp(source).resize(size, size)
      .png({ compressionLevel: 9, palette: true, dither: 0 })
      .toBuffer()
    pngMap[name] = pngBuf

    fs.writeFileSync(path.join(publicAssetsDir, name), pngBuf)
    fs.writeFileSync(path.join(assetsDir, name), pngBuf)

    if (name === 'apple-touch-icon.png') {
      fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuf)
    }
  }

  const icoSizes = [16, 32, 48]
  const icoBuf = createIco(icoSizes.map(size => pngMap[`favicon-${size}x${size}.png`]), icoSizes)

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf)
  fs.writeFileSync(path.join(publicAssetsDir, 'favicon.ico'), icoBuf)
  fs.writeFileSync(path.join(assetsDir, 'favicon.ico'), icoBuf)

  const manifest = {
    name: 'Auckland Roof Professionals',
    short_name: 'ARP Roofing',
    description: 'Auckland commercial and residential roofing specialists with 10-year warranty.',
    start_url: '/',
    display: 'standalone',
    background_color: charcoal,
    theme_color: charcoal,
    icons: [
      {
        src: `/assets/android-chrome-192x192.png?${revision}`,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: `/assets/android-chrome-512x512.png?${revision}`,
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: `/assets/android-chrome-maskable-512x512.png?${revision}`,
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
