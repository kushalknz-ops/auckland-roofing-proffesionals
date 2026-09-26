import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SERVICES, isCommercialService } from '../data/services'
import { CtaBand, MapBand } from '../components/site/shared-bands'
import { useQuote } from '../components/site/quote-context'

export default function ServicePage() {
  const [params] = useSearchParams()
  const s = SERVICES.find((x) => x.id === params.get('id')) ?? SERVICES[0]
  const commercial = isCommercialService(s)
  const category = commercial ? 'Commercial' : 'Residential'
  const categoryPath = commercial ? '/commercial' : '/residential'
  const { openQuote } = useQuote()

  useEffect(() => {
    document.title = `${s.title} | Auckland Roof Professionals`
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', `${s.short} — Auckland Roof Professionals, Auckland-wide.`)
  }, [s])

  const others = SERVICES.filter(
    (x) => x.id !== s.id && isCommercialService(x) === commercial,
  )

  return (
    <main>
      {/* ============ SERVICE HERO ============ */}
      <section className="page-hero">
        <div className="page-hero-media" style={{ '--bg': `url('${s.img}')` } as React.CSSProperties} />
        <div className="page-hero-shade" />
        <div className="page-hero-copy">
          <p className="eyebrow reveal visible">Service {s.num} — {s.badge}</p>
          <h1 className="reveal visible">{s.title}<span className="dim">.</span></h1>
          <p className="reveal visible">{s.short}</p>
          <button className="outline-btn reveal visible" type="button" onClick={() => openQuote(s.title)}>
            Request a quote <span>→</span>
          </button>
          <nav className="crumbs reveal visible" aria-label="Breadcrumb">
            <Link to="/">Home</Link><span>/</span>
            <Link to="/#services">Services</Link><span>/</span>
            <Link to={categoryPath}>{category}</Link><span>/</span>
            <b>{s.title}</b>
          </nav>
        </div>
      </section>

      {/* ============ DETAILS ============ */}
      <section className="service-detail">
        <div className="sd-grid">
          <div className="sd-main">
            <p className="eyebrow eyebrow-dark">Details</p>
            <h2>{s.title} in Auckland.</h2>
            <p className="sd-lead">{s.desc}</p>
            <div className="sd-chips">
              {s.chips.map((chip) => <span key={chip}>{chip}</span>)}
            </div>
            <h3 className="sd-sub">What's included</h3>
            <ul className="sd-specs">
              {s.specs.map((sp) => <li key={sp}>{sp}</li>)}
            </ul>
            <div className="sd-cta-row">
              <button className="inline-submit" type="button" onClick={() => openQuote(s.title)}>
                Request a quote for this service <span>→</span>
              </button>
              <Link className="text-link-dark" to={categoryPath}>← All {category.toLowerCase()} services</Link>
            </div>
          </div>
          <aside className="sd-side">
            <div className="sd-facts">
              <h3>At a glance</h3>
              <dl>
                <div><dt>Category</dt><dd>{s.badge}</dd></div>
                <div><dt>Warranty</dt><dd>10-yr workmanship</dd></div>
                <div><dt>Assessment</dt><dd>Free &amp; obligation-free</dd></div>
                <div><dt>Service area</dt><dd>Auckland-wide</dd></div>
              </dl>
              <button className="submit-btn" type="button" onClick={() => openQuote(s.title)}>
                Request quote →
              </button>
            </div>
            <nav className="sd-other">
              <h3>Other {category.toLowerCase()} services</h3>
              <div>
                {others.map((o) => (
                  <Link key={o.id} to={`/service?id=${o.id}`}>{o.title}<span>→</span></Link>
                ))}
              </div>
            </nav>
          </aside>
        </div>
      </section>

      <MapBand />

      <CtaBand
        heading="Ready to get started?"
        text="Tell us about your project — quotes are free and obligation-free."
      />
    </main>
  )
}
