import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { SERVICES, isCommercialService } from '../src/data/services.ts'
import { PROJECTS } from '../src/data/projects.ts'
import { SOCIAL_WIDTH, SOCIAL_HEIGHT, socialCardPath } from '../src/lib/social-metadata.ts'
import { CANONICAL_HOST } from '../src/lib/site-url.ts'

const root = path.resolve(import.meta.dirname, '..')
const publicDir = path.join(root, 'public')
const fontfile = fileURLToPath(new URL('./fonts/Montserrat-Bold.ttf', import.meta.url))
const cards = [
  { name: 'roofing', photo: 'landing-video-poster.jpg', label: 'AUCKLAND ROOFING SPECIALISTS', title: 'Commercial &\nresidential roofing' },
  { name: 'commercial', photo: 'img/svc-metal-commercial.jpg', label: 'COMMERCIAL', title: 'Roofing &\nwall cladding' },
  { name: 'residential', photo: 'img/audience-home.jpg', label: 'RESIDENTIAL', title: 'Roofing &\nre-roofing' },
  { name: 'contact', photo: 'img/about.jpg', label: '0800 766 311', title: 'Request a free\nroof quote' },
  { name: 'blog', photo: 'blog/commercial-roof-maintenance.jpg', label: 'COMMERCIAL ROOFING BLOG', title: 'Roofing guides\nfor Auckland' },
  ...SERVICES.map((service) => ({
    name: `service-${service.id}`,
    photo: service.img.replace('/assets/', ''),
    label: isCommercialService(service) ? 'COMMERCIAL ROOFING' : 'RESIDENTIAL ROOFING',
    title: service.title,
  })),
  ...PROJECTS.filter(({ imageKind }) => imageKind === 'portfolio').map((project) => ({
    name: `project-${project.slug}`,
    photo: project.img.replace('/assets/', ''),
    label: 'ROOFING PROJECT',
    title: project.title,
    titleSize: 56,
  })),
]

const overlay = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${SOCIAL_WIDTH}" height="${SOCIAL_HEIGHT}">
    <defs>
      <linearGradient id="shade">
        <stop offset="0.38" stop-color="#141918"/>
        <stop offset="0.55" stop-color="#141918" stop-opacity="0.92"/>
        <stop offset="0.78" stop-color="#141918" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#141918" stop-opacity="0.03"/>
      </linearGradient>
      <linearGradient id="edge" x2="0" y2="1">
        <stop offset="0" stop-color="#141918" stop-opacity="0.15"/>
        <stop offset="0.72" stop-color="#141918" stop-opacity="0"/>
        <stop offset="1" stop-color="#141918" stop-opacity="0.72"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#shade)"/>
    <rect width="100%" height="100%" fill="url(#edge)"/>
    <rect x="64" y="182" width="58" height="4" fill="#D99B26"/>
    <rect x="64" y="502" width="1072" height="1" fill="#A5B8AC" opacity="0.55"/>
  </svg>`)

function textLayer(text, size, color, width) {
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  return sharp({ text: {
    text: `<span foreground="${color}">${escaped}</span>`,
    font: `Montserrat Bold ${size}`, fontfile, width, rgba: true,
  } }).png().toBuffer()
}

const logo = await sharp(path.join(publicDir, 'assets/logo-full.png')).resize({ width: 334 }).png().toBuffer()
const domain = await textLayer(CANONICAL_HOST, 25, '#D1DDD6', 650)
await mkdir(path.join(publicDir, 'assets/social'), { recursive: true })

for (const card of cards) {
  const photo = await sharp(path.join(publicDir, 'assets', card.photo))
    .resize(720, SOCIAL_HEIGHT, { fit: 'cover' }).toBuffer()
  const label = await textLayer(card.label, 23, '#A5B8AC', 680)
  const title = await textLayer(card.title, card.titleSize ?? 68, '#F8FAF7', 675)
  const output = path.join(publicDir, socialCardPath(card.name))
  const { size } = await sharp({ create: {
    width: SOCIAL_WIDTH, height: SOCIAL_HEIGHT, channels: 3, background: '#141918',
  } }).composite([
    { input: photo, left: SOCIAL_WIDTH - 720, top: 0 },
    { input: overlay },
    { input: logo, left: 64, top: 62 },
    { input: label, left: 64, top: 223 },
    { input: title, left: 64, top: 274 },
    { input: domain, left: 64, top: 537 },
  ]).jpeg({ quality: 88, mozjpeg: true }).toFile(output)
  console.log(`${path.basename(output)} (${Math.round(size / 1000)} KB)`)
}
