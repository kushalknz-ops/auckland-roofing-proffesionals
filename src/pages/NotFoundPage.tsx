import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../hooks/useSEO'
import { useQuote } from '../components/site/quote-context'
import { SERVICES } from '../data/services'
import '../notfound.css'

interface QuickLink {
  id: string
  title: string
  category: string
  description: string
  href: string
  isExternal?: boolean
}

const QUICK_LINKS: QuickLink[] = [
  {
    id: 'residential',
    title: 'Residential Roofing',
    category: 'Home & Living',
    description: 'Asphalt shingles, Colorsteel® long run metal roofing, warm roofs and residential re-roofing with 10-year workmanship warranties.',
    href: '/residential',
  },
  {
    id: 'commercial',
    title: 'Commercial Roofing',
    category: 'Commercial',
    description: 'Industrial metal roofs & wall cladding, certified TPO membrane waterproofing, warm roof systems and height safety installations.',
    href: '/commercial',
  },
  {
    id: 'contact',
    title: 'Contact & Inspections',
    category: 'Support',
    description: 'Speak with our Auckland roofers, book a comprehensive on-site assessment, or request immediate leak investigation.',
    href: '/contact',
  },
  {
    id: 'services-all',
    title: 'Full Services Directory',
    category: 'Catalogue',
    description: 'Explore all specialized roofing solutions, architectural specifications, warranty coverages and materials.',
    href: '/#services',
  },
]

export default function NotFoundPage() {
  const { openQuote } = useQuote()
  const [searchTerm, setSearchTerm] = useState('')

  useSEO({
    title: '404 - Page Not Found | Auckland Roof Professionals',
    description: 'The page you requested could not be found. Explore Auckland Roof Professionals commercial and residential roofing services or contact our team.',
    noIndex: true,
    canonical: '/404',
  })

  // Filter both curated links and services based on user search term
  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return null

    const matchedLinks = QUICK_LINKS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    )

    const matchedServices = SERVICES.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.chips.some((chip) => chip.toLowerCase().includes(q))
    ).map((s) => ({
      id: `svc-${s.id}`,
      title: s.title,
      category: s.badge,
      description: s.short,
      href: `/service?id=${s.id}`,
    }))

    // Deduplicate
    const combined = [...matchedLinks]
    for (const item of matchedServices) {
      if (!combined.some((c) => c.href === item.href)) {
        combined.push(item)
      }
    }
    return combined
  }, [searchTerm])

  return (
    <main className="not-found-page">
      {/* ============ 1. 404 HERO ============ */}
      <section className="not-found-hero">
        <div className="not-found-hero-media" aria-hidden="true" />
        <div className="not-found-hero-shade" aria-hidden="true" />
        <div className="container not-found-hero-inner">
          <div className="not-found-badge">
            <span className="not-found-badge-dot" />
            <span>Error 404 — Page Not Found</span>
          </div>

          <h1>
            Looks like you've wandered <br />
            <span className="dim">off the ridge line.</span>
          </h1>

          <p className="lead">
            The page or document you're looking for may have been moved, renamed,
            or is temporarily unavailable. Let's get you back under a solid roof.
          </p>

          <nav className="not-found-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <b>404 Error</b>
          </nav>
        </div>
      </section>

      {/* ============ 2. MAIN BODY / NAVIGATION ASSISTANCE ============ */}
      <section className="not-found-body">
        <div className="container">
          {/* Quick Primary Actions */}
          <div className="not-found-actions">
            <Link to="/" className="btn-solid-charcoal">
              <span>← Return to Homepage</span>
            </Link>

            <button
              type="button"
              className="btn-sage-accent"
              onClick={() => openQuote()}
            >
              <span>Request a Free Quote →</span>
            </button>

            <Link to="/contact" className="btn-outline-charcoal">
              <span>Contact Auckland Team</span>
            </Link>
          </div>

          {/* Quick Search */}
          <div className="not-found-search-wrap">
            <label htmlFor="notFoundSearch" className="not-found-search-label">
              Find a roofing service or topic
            </label>
            <div className="not-found-search-bar">
              <span className="not-found-search-icon" aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                id="notFoundSearch"
                type="text"
                className="not-found-search-input"
                placeholder="Search metal roofs, shingles, membrane, leak repairs, inspections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Search Results Or Default Quick Destinations */}
          <div className="not-found-section-title">
            <h2>
              {searchResults !== null
                ? `Search Results for "${searchTerm}"`
                : 'Popular Destinations & Services'}
            </h2>
            <p>
              {searchResults !== null
                ? `Found ${searchResults.length} matching destinations.`
                : 'Choose an option below to jump directly to where you need to go.'}
            </p>
          </div>

          {searchResults && searchResults.length === 0 ? (
            <div className="not-found-no-results">
              <p>
                No exact matches found for "<strong>{searchTerm}</strong>".
              </p>
              <p>
                Try searching for "shingles", "commercial", "membrane", or{' '}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setSearchTerm('')}
                >
                  clear search
                </button>{' '}
                to see all core sections.
              </p>
            </div>
          ) : (
            <div className="not-found-grid">
              {(searchResults || QUICK_LINKS).map((item) => (
                <Link
                  key={item.id}
                  to={item.href}
                  className="not-found-card"
                  aria-label={`Go to ${item.title}`}
                >
                  <div>
                    <div className="not-found-card-top">
                      <span className="not-found-card-badge">
                        {item.category}
                      </span>
                      <div className="not-found-card-icon" aria-hidden="true">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </div>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                  <span className="not-found-card-link">
                    Explore Now <span>→</span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Urgent Leak / Emergency Contact Box */}
          <div className="not-found-assistance">
            <div className="not-found-assistance-content">
              <h3>Have an Active Leak or Urgent Enquiry?</h3>
              <p>
                Our Glenfield workshop and mobile Auckland crews are available for
                urgent weather-tightness inspections and prompt roof assessments across
                all Auckland suburbs.
              </p>
            </div>
            <div className="not-found-assistance-contact">
              <a href="tel:0800555766" className="not-found-phone-btn">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>Call 0800 555 766</span>
              </a>
              <Link to="/contact" className="btn-outline-charcoal" style={{ color: '#F8FAF7', borderColor: '#DCE4DF' }}>
                <span>Send a Message</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
