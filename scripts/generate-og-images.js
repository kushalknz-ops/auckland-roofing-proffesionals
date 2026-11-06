import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const publicAssetsDir = path.resolve(projectRoot, 'public', 'assets')
const assetsDir = path.resolve(projectRoot, 'assets')

function escapeXml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function getPngBase64(filePath) {
  const pngBuf = await sharp(filePath).png().toBuffer()
  return `data:image/png;base64,${pngBuf.toString('base64')}`
}

async function createSocialCard({
  bgImageSrc,
  eyebrowText,
  headline,
  subheadline,
  serviceBullets,
  accentColor = '#10B981',
  outputFilenameJpg,
  outputFilenamePng,
}) {
  const width = 1200
  const height = 630

  // 1. Process background image: resize and crop to 1200x630
  const bgBuffer = await sharp(bgImageSrc)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .toBuffer()

  // 2. Read logo and certification badges as pure PNG data URIs
  const logoLightUri = await getPngBase64(path.join(publicAssetsDir, 'logo-full.png'))
  const lbpBadgeUri = await getPngBase64(path.join(publicAssetsDir, 'img', 'cert-lbp.webp'))
  const siteSafeBadgeUri = await getPngBase64(path.join(publicAssetsDir, 'img', 'cert-sitesafe.webp'))

  const safeEyebrow = escapeXml(eyebrowText)
  const safeHeadline = escapeXml(headline)
  const safeSubheadline = escapeXml(subheadline)
  const safeBullets = (serviceBullets || []).map(b => escapeXml(b))

  // Calculate dynamic pill widths and offsets
  const pillGap = 12
  let currentPillX = 0
  const pillsSvg = safeBullets.map((bullet) => {
    const pillWidth = Math.max(135, Math.min(220, Math.round(bullet.length * 8.5 + 44)))
    const x = currentPillX
    currentPillX += pillWidth + pillGap
    return `
    <g transform="translate(${x}, 0)">
      <rect x="0" y="0" width="${pillWidth}" height="36" rx="8" fill="url(#cardGrad)" stroke="#A5B8AC" stroke-opacity="0.3" stroke-width="1" />
      <circle cx="16" cy="18" r="4" fill="#A5B8AC" />
      <text x="28" y="23" class="pill-text">${bullet}</text>
    </g>`
  }).join('')

  // 3. Compose SVG overlay with exact brand colors and typography
  // Charcoal: #141918 / #1B2220 / #232C2A, Sage: #A5B8AC, Gold: #D99B26
  const svgOverlay = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Vignette & Dark Overlay Gradient -->
    <linearGradient id="overlayGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#121716" stop-opacity="0.98" />
      <stop offset="46%" stop-color="#18201E" stop-opacity="0.94" />
      <stop offset="70%" stop-color="#1E2725" stop-opacity="0.75" />
      <stop offset="100%" stop-color="#141918" stop-opacity="0.55" />
    </linearGradient>

    <linearGradient id="bottomVignette" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0" />
      <stop offset="65%" stop-color="#101514" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#0A0E0D" stop-opacity="0.95" />
    </linearGradient>

    <!-- Top Accent Bar Gradient -->
    <linearGradient id="accentBar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8FA597" />
      <stop offset="35%" stop-color="#A5B8AC" />
      <stop offset="70%" stop-color="#D99B26" />
      <stop offset="100%" stop-color="#8FA597" />
    </linearGradient>

    <!-- Badge Background Gradient -->
    <linearGradient id="pillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#26312E" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#1D2624" stop-opacity="0.95" />
    </linearGradient>

    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#222C2A" stop-opacity="0.92" />
      <stop offset="100%" stop-color="#1A2220" stop-opacity="0.92" />
    </linearGradient>

    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <style>
    text {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .eyebrow { font-size: 13px; font-weight: 700; letter-spacing: 1.8px; fill: #A5B8AC; text-transform: uppercase; }
    .headline { font-size: 44px; font-weight: 800; fill: #FFFFFF; letter-spacing: -0.5px; }
    .subhead { font-size: 20px; font-weight: 400; fill: #D1DDD6; }
    .pill-text { font-size: 14px; font-weight: 600; fill: #F8FAF7; }
    .badge-title { font-size: 13px; font-weight: 800; fill: #FFFFFF; letter-spacing: 0.5px; }
    .badge-sub { font-size: 12px; font-weight: 500; fill: #A5B8AC; }
    .side-title { font-size: 12px; font-weight: 800; letter-spacing: 1.5px; fill: #A5B8AC; }
    .side-item { font-size: 14px; font-weight: 600; fill: #FFFFFF; }
    .cta-tel { font-size: 19px; font-weight: 800; fill: #FFFFFF; letter-spacing: 0.8px; }
    .cta-pitch { font-size: 15px; font-weight: 700; fill: #FFFFFF; letter-spacing: 0.3px; }
    .cta-sub { font-size: 13px; font-weight: 400; fill: #A5B8AC; }
    .cta-domain { font-size: 16px; font-weight: 700; fill: #A5B8AC; }
    .cta-badge { font-size: 12px; font-weight: 500; fill: #8FA597; }
  </style>

  <!-- Dark Gradient Overlay over Background -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#overlayGrad)" />
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bottomVignette)" />

  <!-- Top Decorative Accent Bar -->
  <rect x="0" y="0" width="${width}" height="6" fill="url(#accentBar)" />

  <!-- Subtle Outer Border (Safe Zone Boundary) -->
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="16" fill="none" stroke="#A5B8AC" stroke-opacity="0.22" stroke-width="1.2" />

  <!-- Brand Logo Top Left -->
  <g transform="translate(60, 48)" filter="url(#shadow)">
    <image href="${logoLightUri}" width="360" height="73" preserveAspectRatio="xMinYMid meet" />
  </g>

  <!-- Eyebrow Pill Badge -->
  <g transform="translate(60, 142)">
    <rect x="0" y="0" width="375" height="32" rx="16" fill="url(#pillGrad)" stroke="#A5B8AC" stroke-opacity="0.35" stroke-width="1" />
    <circle cx="18" cy="16" r="4.5" fill="${accentColor}" />
    <text x="32" y="21" class="eyebrow">${safeEyebrow}</text>
  </g>

  <!-- Main Headline -->
  <text x="60" y="220" class="headline" filter="url(#shadow)">${safeHeadline}</text>

  <!-- Subheadline -->
  <text x="60" y="258" class="subhead">${safeSubheadline}</text>

  <!-- Service Pills (Row 1) -->
  <g transform="translate(60, 286)">
    ${pillsSvg}
  </g>

  <!-- Trust Badges & Certifications Row -->
  <g transform="translate(60, 348)">
    <!-- 10-Year Warranty Badge -->
    <g transform="translate(0, 0)">
      <rect x="0" y="0" width="224" height="66" rx="10" fill="url(#cardGrad)" stroke="#D99B26" stroke-opacity="0.45" stroke-width="1.2" />
      <!-- Shield Icon -->
      <g transform="translate(14, 16)">
        <path d="M14 2 L2 7 V16 C2 23.5 7.2 30.5 14 32 C20.8 30.5 26 23.5 26 16 V7 Z" fill="#D99B26" fill-opacity="0.2" stroke="#D99B26" stroke-width="2" />
        <path d="M9 16 L12.5 19.5 L19 12" fill="none" stroke="#D99B26" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </g>
      <text x="54" y="30" class="badge-title">10-YEAR WARRANTY</text>
      <text x="54" y="49" class="badge-sub">Workmanship Backed</text>
    </g>

    <!-- 5-Star Reviews Badge -->
    <g transform="translate(236, 0)">
      <rect x="0" y="0" width="224" height="66" rx="10" fill="url(#cardGrad)" stroke="#A5B8AC" stroke-opacity="0.3" stroke-width="1" />
      <!-- Star Icon -->
      <g transform="translate(14, 17)">
        <circle cx="14" cy="14" r="14" fill="#D99B26" fill-opacity="0.2" />
        <text x="14" y="19" text-anchor="middle" font-size="16" fill="#F59E0B">★</text>
      </g>
      <text x="52" y="30" class="badge-title">5.0 ★★★★★</text>
      <text x="52" y="49" class="badge-sub">50+ Verified NZ Reviews</text>
    </g>

    <!-- LBP Official Badge Image -->
    <g transform="translate(472, 0)">
      <rect x="0" y="0" width="142" height="66" rx="10" fill="#FFFFFF" fill-opacity="0.96" stroke="#D1DDD6" stroke-width="1" />
      <image href="${lbpBadgeUri}" x="10" y="10" width="122" height="46" preserveAspectRatio="xMidYMid meet" />
    </g>

    <!-- Site Safe Official Badge Image -->
    <g transform="translate(626, 0)">
      <rect x="0" y="0" width="142" height="66" rx="10" fill="#FFFFFF" fill-opacity="0.96" stroke="#D1DDD6" stroke-width="1" />
      <image href="${siteSafeBadgeUri}" x="10" y="10" width="122" height="46" preserveAspectRatio="xMidYMid meet" />
    </g>
  </g>

  <!-- Right Floating Quality Feature Card -->
  <g transform="translate(830, 80)">
    <rect x="0" y="0" width="310" height="340" rx="14" fill="#141918" fill-opacity="0.86" stroke="#A5B8AC" stroke-opacity="0.32" stroke-width="1.2" />
    
    <g transform="translate(24, 26)">
      <text x="0" y="0" class="side-title">AUCKLAND-WIDE SERVICE</text>
      
      <!-- Feature 1 -->
      <g transform="translate(0, 24)">
        <circle cx="10" cy="10" r="10" fill="#10B981" fill-opacity="0.25" />
        <path d="M6 10 L9 13 L14 7" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" />
        <text x="28" y="15" class="side-item">North Shore &amp; Rodney</text>
      </g>
      
      <!-- Feature 2 -->
      <g transform="translate(0, 64)">
        <circle cx="10" cy="10" r="10" fill="#10B981" fill-opacity="0.25" />
        <path d="M6 10 L9 13 L14 7" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" />
        <text x="28" y="15" class="side-item">Central, East &amp; West</text>
      </g>

      <!-- Feature 3 -->
      <g transform="translate(0, 104)">
        <circle cx="10" cy="10" r="10" fill="#10B981" fill-opacity="0.25" />
        <path d="M6 10 L9 13 L14 7" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" />
        <text x="28" y="15" class="side-item">South Auckland &amp; Manukau</text>
      </g>

      <!-- Divider -->
      <line x1="0" y1="138" x2="262" y2="138" stroke="#A5B8AC" stroke-opacity="0.25" stroke-width="1" />

      <!-- Emergency / Rapid Box -->
      <g transform="translate(0, 160)">
        <text x="0" y="0" font-size="11" font-weight="800" letter-spacing="1.5px" fill="#D99B26">RAPID RESPONSE</text>
        <text x="0" y="24" class="side-item">24/7 Leak Assistance</text>
        <text x="0" y="44" font-size="13" font-weight="400" fill="#A5B8AC">Emergency Tarp &amp; Fast Repairs</text>
      </g>

      <!-- HQ Location -->
      <g transform="translate(0, 246)">
        <text x="0" y="12" font-size="12" font-weight="600" fill="#8FA597">HQ: 59 Porana Rd, Glenfield</text>
      </g>
    </g>
  </g>

  <!-- Bottom CTA Ribbon -->
  <g transform="translate(60, 464)">
    <rect x="0" y="0" width="${width - 120}" height="86" rx="14" fill="#141A18" fill-opacity="0.96" stroke="#A5B8AC" stroke-opacity="0.35" stroke-width="1.2" />
    
    <!-- Phone Call CTA Box -->
    <g transform="translate(20, 19)">
      <rect x="0" y="0" width="255" height="48" rx="8" fill="#246A4C" stroke="#34D399" stroke-opacity="0.4" stroke-width="1" />
      <!-- Phone icon -->
      <g transform="translate(18, 14)">
        <path d="M3.6 1.5 C2.4 1.5 1.5 2.4 1.5 3.6 C1.5 11.6 7.9 18 15.9 18 C17.1 18 18 17.1 18 15.9 L18 13.5 C18 12.8 17.5 12.2 16.8 12.1 L13.3 11.4 C12.7 11.3 12.1 11.5 11.7 12.0 L10.6 13.1 C8.2 11.8 6.2 9.8 4.9 7.4 L6.0 6.3 C6.5 5.9 6.7 5.3 6.6 4.7 L5.9 1.2 C5.8 0.5 5.2 0 4.5 0 L2.1 0 Z" fill="#F8FAF7" transform="scale(1.1)" />
      </g>
      <text x="50" y="31" class="cta-tel">0800 555 766</text>
    </g>

    <!-- Center Pitch -->
    <g transform="translate(300, 28)">
      <text x="0" y="16" class="cta-pitch">FREE ON-SITE ASSESSMENT &amp; QUOTE</text>
      <text x="0" y="38" class="cta-sub">Residential Re-roofing • Commercial Projects • Roof Repairs</text>
    </g>

    <!-- Right Domain Link -->
    <g transform="translate(800, 31)">
      <text x="256" y="16" text-anchor="end" class="cta-domain">aucklandroofprofessionals.nz</text>
      <text x="256" y="36" text-anchor="end" class="cta-badge">Licensed &amp; Insured NZ Roofers</text>
    </g>
  </g>
</svg>
`

  // 4. Composite the SVG overlay onto the base image
  const cardSharp = sharp(bgBuffer)
    .composite([
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      },
    ])

  // 5. Save as optimized JPEG (target <250KB for WhatsApp and fast mobile loads)
  const jpgBuffer = await cardSharp
    .clone()
    .jpeg({ quality: 89, progressive: true, mozjpeg: true })
    .toBuffer()

  // 6. Save as PNG (crisp lossless alternative)
  const pngBuffer = await cardSharp
    .clone()
    .png({ compressionLevel: 8 })
    .toBuffer()

  // Write to public/assets and assets
  const targets = [
    { dir: publicAssetsDir, jpg: outputFilenameJpg, png: outputFilenamePng },
    { dir: assetsDir, jpg: outputFilenameJpg, png: outputFilenamePng },
  ]

  for (const t of targets) {
    if (!fs.existsSync(t.dir)) fs.mkdirSync(t.dir, { recursive: true })
    if (t.jpg) fs.writeFileSync(path.join(t.dir, t.jpg), jpgBuffer)
    if (t.png) fs.writeFileSync(path.join(t.dir, t.png), pngBuffer)
  }

  console.log(`Generated ${outputFilenameJpg}: ${Math.round(jpgBuffer.length / 1024)} KB (${width}x${height})`)
  console.log(`Generated ${outputFilenamePng}: ${Math.round(pngBuffer.length / 1024)} KB (${width}x${height})`)
}

async function main() {
  console.log('Generating high-quality branded Open Graph social preview images...')

  // 1. Primary flagship image: og-image.jpg (1200x630)
  await createSocialCard({
    bgImageSrc: path.join(publicAssetsDir, 'landing-video-poster.jpg'),
    eyebrowText: "Auckland's Trusted Roofing Specialists",
    headline: 'Commercial & Residential Roofing',
    subheadline: 'Expert metal roofing, waterproof membranes, warm roofs & shingles.',
    serviceBullets: ['Colorsteel® Metal', 'Membrane Systems', 'Warm Roof Systems', 'Asphalt Shingles'],
    accentColor: '#10B981',
    outputFilenameJpg: 'og-image.jpg',
    outputFilenamePng: 'og-image.png',
  })

  // 2. Commercial Category image: og-commercial.jpg (1200x630)
  await createSocialCard({
    bgImageSrc: path.join(publicAssetsDir, 'img', 'svc-metal-commercial.jpg'),
    eyebrowText: 'Commercial Roofing & Cladding Auckland',
    headline: 'Commercial Roofing Specialists',
    subheadline: 'Industrial roofing, standing seam, warm roofs, height safety & maintenance.',
    serviceBullets: ['Standing Seam', 'TPO Waterproofing', 'Commercial Warm Roofs', 'Roof Asset Care'],
    accentColor: '#3B82F6',
    outputFilenameJpg: 'og-commercial.jpg',
    outputFilenamePng: 'og-commercial.png',
  })

  // 3. Residential Category image: og-residential.jpg (1200x630)
  await createSocialCard({
    bgImageSrc: path.join(publicAssetsDir, 'img', 'audience-home.jpg'),
    eyebrowText: 'Auckland Residential Roofing Specialists',
    headline: 'Residential Roofing & Re-Roofing',
    subheadline: 'Architectural asphalt shingles, Colorsteel® long run, membrane decks & leak repair.',
    serviceBullets: ['Colorsteel® Roofs', 'Asphalt Shingles', 'Membrane Decks', 'Emergency Repairs'],
    accentColor: '#10B981',
    outputFilenameJpg: 'og-residential.jpg',
    outputFilenamePng: 'og-residential.png',
  })

  // 4. Contact / Quote image: og-contact.jpg (1200x630)
  await createSocialCard({
    bgImageSrc: path.join(publicAssetsDir, 'img', 'about.jpg'),
    eyebrowText: 'Free Assessments & Emergency Leak Repairs',
    headline: 'Contact Auckland Roof Professionals',
    subheadline: 'Call 0800 555 766 or request a free quote online. Based in Glenfield, Auckland.',
    serviceBullets: ['Free On-Site Quotes', 'Emergency Repairs', 'Insurance Reports', 'Expert Roof Advice'],
    accentColor: '#E5A83B',
    outputFilenameJpg: 'og-contact.jpg',
    outputFilenamePng: 'og-contact.png',
  })

  console.log('Social preview images created successfully!')
}

main().catch((err) => {
  console.error('Error generating social preview images:', err)
  process.exit(1)
})
