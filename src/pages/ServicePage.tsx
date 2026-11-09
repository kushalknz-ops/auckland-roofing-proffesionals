import { Link, useParams, useSearchParams } from 'react-router-dom'
import { SERVICES, isCommercialService } from '../data/services'
import { CtaBand, MapBand } from '../components/site/shared-bands'
import { useQuote } from '../components/site/quote-context'
import { useSEO } from '../hooks/useSEO'
import { findService, getServiceSEO } from '../lib/page-seo'
import { EmptyState } from '../components/ui/EmptyState'

export default function ServicePage() {
  const [params] = useSearchParams()
  const rawId = useParams().id ?? params.get('id')
  const { openQuote } = useQuote()

  const s = findService(rawId)

  useSEO(getServiceSEO(s))

  // Empty / Not-Found State: user passed an ID that doesn't exist
  if (rawId && !s) {
    return (
      <main id="main-content" tabIndex={-1}>
        <section className="page-hero">
          <div className="page-hero-media" style={{ '--bg': `url('/assets/img/about.jpg')` } as React.CSSProperties} />
          <div className="page-hero-shade" />
          <div className="container">
            <div className="page-hero-copy">
              <p className="eyebrow reveal visible">Services Directory</p>
              <h1 className="reveal visible">Service Not Found<span className="dim">.</span></h1>
              <p className="reveal visible">We could not locate a roofing service matching "{rawId}".</p>
              <nav className="crumbs reveal visible" aria-label="Breadcrumb">
                <Link to="/">Home</Link><span>/</span>
                <Link to="/#services">Services</Link><span>/</span>
                <b>Not Found</b>
              </nav>
            </div>
          </div>
        </section>

        <section className="section" style={{ background: '#F8FAF7', padding: '60px 0' }}>
          <div className="container">
            <EmptyState
              title="Requested Service Unavailable"
              description={`The roofing service "${rawId}" does not exist in our directory or may have been updated.`}
              action={{
                label: 'View Commercial Services',
                href: '/commercial',
              }}
              secondaryAction={{
                label: 'View Residential Services',
                href: '/residential',
              }}
            >
              <div style={{ marginTop: '24px', textAlign: 'left' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#2C3533', marginBottom: '12px' }}>
                  Available Auckland Roofing Services:
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '10px' }}>

                  {SERVICES.map((item) => (
                    <Link
                      key={item.id}
                      to={`/service/${item.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                        padding: '12px 14px',
                        background: '#FFFFFF',
                        border: '1px solid #D1DDD6',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#2C3533',
                        textDecoration: 'none',
                      }}
                    >
                      <span>{item.title}</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted-l)' }}>{item.badge} →</span>
                    </Link>
                  ))}
                </div>
              </div>
            </EmptyState>
          </div>
        </section>

        <CtaBand
          heading="Need guidance on your roof project?"
          text="Speak directly with our Auckland roofing specialists for honest recommendations."
        />
      </main>
    )
  }

  // Safe fallback if SERVICES is empty
  if (!s) {
    return (
      <main id="main-content" tabIndex={-1}>
        <section className="section" style={{ background: '#F8FAF7', padding: '100px 0' }}>
          <div className="container">
            <EmptyState
              title="No Services Currently Listed"
              description="Our services catalog is temporarily updating. Please contact our team directly."
              action={{ label: 'Return to Homepage', href: '/' }}
              secondaryAction={{ label: 'Contact Us', href: '/contact' }}
            />
          </div>
        </section>
      </main>
    )
  }

  const commercial = isCommercialService(s)
  const category = commercial ? 'Commercial' : 'Residential'
  const categoryPath = commercial ? '/commercial' : '/residential'

  const others = SERVICES.filter(
    (x) => x.id !== s.id && isCommercialService(x) === commercial,
  )

  return (
    <main id="main-content" tabIndex={-1}>
      {/* ============ SERVICE HERO ============ */}
      <section className="page-hero">

        <div className="page-hero-media" style={{ '--bg': `url('${s.img}')` } as React.CSSProperties} />
        <div className="page-hero-shade" />
        <div className="container">
          <div className="page-hero-copy">
            <p className="eyebrow reveal visible">Service {s.num} — {s.badge}</p>
            <h1 className="reveal visible">{s.title}<span className="dim">.</span></h1>
            <p className="reveal visible">{s.short}</p>
            <button className="outline-btn reveal visible" type="button" onClick={(event) => openQuote(event.currentTarget, s.title)}>
              Request a quote <span>→</span>
            </button>
            <nav className="crumbs reveal visible" aria-label="Breadcrumb">
              <Link to="/">Home</Link><span>/</span>
              <Link to="/#services">Services</Link><span>/</span>
              <Link to={categoryPath}>{category}</Link><span>/</span>
              <b>{s.title}</b>
            </nav>
          </div>
        </div>
      </section>

      {/* ============ DETAILS ============ */}
      <section className="service-detail">
        <div className="container">
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
              <button className="inline-submit" type="button" onClick={(event) => openQuote(event.currentTarget, s.title)}>
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
              <button className="submit-btn" type="button" onClick={(event) => openQuote(event.currentTarget, s.title)}>
                Request quote →
              </button>
            </div>
            <nav className="sd-other" aria-label={`Other ${category.toLowerCase()} services`}>
              <h3>Other {category.toLowerCase()} services</h3>

              <div>
                {others.map((o) => (
                  <Link key={o.id} to={`/service/${o.id}`}>{o.title}<span>→</span></Link>
                ))}
              </div>
            </nav>
          </aside>
        </div>
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
