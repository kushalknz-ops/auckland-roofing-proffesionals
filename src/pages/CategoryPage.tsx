import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import { SERVICES, isCommercialService, type Service } from '../data/services'
import { CtaBand } from '../components/site/shared-bands'
import { useQuote } from '../components/site/quote-context'
import { useSEO } from '../hooks/useSEO'

const COPY: Record<
  'commercial' | 'residential',
  {
    eyebrow: string
    title: JSX.Element
    lead: string
    heroImg: string
    btn: string
    crumb: string
    label: string
    note: string
    noteLink: string
    switchText: string
    switchBtn: string
    switchTo: string
    ctaHeading: string
    ctaText: string
  }
> = {
  commercial: {
    eyebrow: 'Owners & Building Managers',
    title: <>Commercial<br /><span className="dim">roofing services.</span></>,
    lead: 'Metal roofs & cladding, membrane roofing, warm roof systems, roof safety and asset maintenance — engineered around your building and the people using it.',
    heroImg: '/assets/img/audience-business.jpg',
    btn: 'View commercial services',
    crumb: 'Commercial',
    label: 'Commercial — 5 services',
    note: 'Every system is installed by our own licensed crews and backed by our 10-year workmanship warranty.',
    noteLink: 'Request a free site assessment →',
    switchText: 'Working on your home instead?',
    switchBtn: 'See residential services',
    switchTo: '/residential',
    ctaHeading: 'Plan your next roof project.',
    ctaText: 'Get a free, no-obligation assessment and quote for your building.',
  },
  residential: {
    eyebrow: 'Homeowners & Builders',
    title: <>Residential<br /><span className="dim">roofing services.</span></>,
    lead: "Specialised asphalt shingles, metal roofs, membrane roofing and warm roof systems — whether you're tracing a leak, planning a replacement or choosing a roof for a new build.",
    heroImg: '/assets/img/audience-home.jpg',
    btn: 'View residential services',
    crumb: 'Residential',
    label: 'Residential — 4 services',
    note: 'Every roof is installed by our own licensed crew and backed by our 10-year workmanship warranty.',
    noteLink: 'Request a free roof assessment →',
    switchText: 'Managing a building or portfolio?',
    switchBtn: 'See commercial services',
    switchTo: '/commercial',
    ctaHeading: 'Plan your next roof project.',
    ctaText: 'Get your free, no-obligation assessment and quote for your home.',
  },
}

function ServiceCard({ s }: { s: Service }) {
  return (
    <Link
      className="image-card"
      to={`/service?id=${s.id}`}
      style={{ '--bg': `url('${s.img}')` } as React.CSSProperties}
      aria-label={`View ${s.title}`}
    >
      <div className="card-top"><span>{s.num}</span><span className="card-badge">{s.badge}</span></div>
      <div className="card-body">
        <h3>{s.title}</h3>
        <p>{s.short}</p>
        <span className="card-arrow">→</span>
      </div>
    </Link>
  )
}

export default function CategoryPage({ kind }: { kind: 'commercial' | 'residential' }) {
  const c = COPY[kind]
  const { openQuote } = useQuote()
  const commercial = kind === 'commercial'
  const list = SERVICES.filter((s) => (commercial ? isCommercialService(s) : !isCommercialService(s)))

  useSEO({
    title: commercial
      ? 'Commercial Roofing Services Auckland | Auckland Roof Professionals'
      : 'Residential Roofing Auckland | Shingles & Metal Roofs | Auckland Roof Professionals',
    description: commercial
      ? 'Commercial roofing & cladding solutions across Auckland. Standing seam, TPO membrane, warm roof systems, height safety & maintenance. 10-year warranty.'
      : 'Specialist residential roofing in Auckland: architectural asphalt shingles, Colorsteel® long run metal roofs, membrane decks & warm roofs. Free quotes.',
    canonical: commercial ? '/commercial' : '/residential',
    ogImage: c.heroImg,
    keywords: commercial
      ? 'commercial roofing Auckland, commercial re-roofing, metal cladding, membrane roofing Auckland, warm roofs NZ, roof safety systems, roof asset maintenance'
      : 'residential roofing Auckland, asphalt shingles Auckland, Colorsteel roofing, residential re-roofing Auckland, roof leak repair, membrane flat roofs, warm roof retrofit',
  })

  return (
    <main>
      {/* ============ PAGE HERO ============ */}
      <section className="page-hero">
        <div className="page-hero-media" style={{ '--bg': `url('${c.heroImg}')` } as React.CSSProperties} />
        <div className="page-hero-shade" />
        <div className="container">
          <div className="page-hero-copy">
            <p className="eyebrow reveal">{c.eyebrow}</p>
            <h1 className="reveal">{c.title}</h1>
            <p className="reveal">{c.lead}</p>
            <a className="outline-btn reveal" href="#svcList">{c.btn} <span>↓</span></a>
            <nav className="crumbs reveal" aria-label="Breadcrumb">
              <Link to="/">Home</Link><span>/</span><Link to="/#services">Services</Link><span>/</span><b>{c.crumb}</b>
            </nav>
          </div>
        </div>
      </section>

      {/* ============ SERVICE CARDS ============ */}
      <section className="section svc-page" id="svcList">
        <div className="container">
          <p className="service-group-label reveal">{c.label}</p>
          <div className="card-grid">
            {list.map((s) => <ServiceCard key={s.id} s={s} />)}
          </div>
          <p className="svc-note reveal">
            {c.note}{' '}
            <a className="text-link" href="#" onClick={(e) => { e.preventDefault(); openQuote() }}>
              {c.noteLink}
            </a>
          </p>
        </div>
      </section>

      {/* ============ SWITCH BAND ============ */}
      <section className="switch-band">
        <div className="container switch-band-inner">
          <p className="reveal">{c.switchText}</p>
          <Link className="outline-btn reveal" to={c.switchTo}>{c.switchBtn} <span>→</span></Link>
        </div>
      </section>

      <CtaBand heading={c.ctaHeading} text={c.ctaText} />
    </main>
  )
}
