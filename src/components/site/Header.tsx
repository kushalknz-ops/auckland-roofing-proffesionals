import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuote } from './quote-context'
import { SERVICES, isCommercialService } from '../../data/services'

const NAV = [
  { label: 'Home', path: '/' },
  { label: 'Services', path: '/#services', isMegaMenu: true },
  { label: 'Projects', path: '/#projects' },
  { label: 'Process', path: '/#process' },
  { label: 'About', path: '/#about' },
  { label: 'FAQ', path: '/#faq' },
  { label: 'Contact Us', path: '/contact' },
]

export function Header() {
  const { pathname, search } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [mobileServicesExpanded, setMobileServicesExpanded] = useState(true)
  const { openQuote } = useQuote()

  const headerRef = useRef<HTMLElement>(null)
  const megaMenuRef = useRef<HTMLDivElement>(null)

  const residentialServices = SERVICES.filter((s) => !isCommercialService(s))
  const commercialServices = SERVICES.filter((s) => isCommercialService(s))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* close menus when route changes */
  useEffect(() => {
    setMenuOpen(false)
    setServicesOpen(false)
  }, [pathname, search])

  /* Click outside to close services mega-menu */
  useEffect(() => {
    if (!servicesOpen) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (
        megaMenuRef.current &&
        !megaMenuRef.current.contains(target) &&
        headerRef.current &&
        !headerRef.current.contains(target)
      ) {
        setServicesOpen(false)
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setServicesOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [servicesOpen])

  /* Lock body scroll when mobile menu is open */
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setMenuOpen(false)
      }
      document.addEventListener('keydown', onKey)
      return () => {
        document.removeEventListener('keydown', onKey)
        document.body.style.overflow = ''
      }
    }
  }, [menuOpen])

  const toggleServices = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setServicesOpen((prev) => !prev)
  }

  const closeAllMenus = () => {
    setServicesOpen(false)
    setMenuOpen(false)
  }

  return (
    <>
      <header
        ref={headerRef}
        className={`site-header${scrolled ? ' scrolled' : ''}${servicesOpen ? ' services-active' : ''}`}
        id="siteHeader"
      >
        {/* liquid-glass layers — shown only when .scrolled on >=901px (see arp.css) */}
        <div className="header-glass" aria-hidden="true">
          <div className="hg-layer hg-distort" />
          <div className="hg-layer hg-tint" />
          <div className="hg-layer hg-highlight" />
        </div>

        <Link
          className="brand"
          to="/"
          aria-label="Auckland Roof Professionals — home"
          onClick={closeAllMenus}
        >
          <img src="/assets/logo-full.png" alt="Auckland Roof Professionals" className="brand-logo brand-logo--light" />
          <img src="/assets/logo-navy.png" alt="" className="brand-logo brand-logo--navy" aria-hidden="true" />
        </Link>

        <nav className="desktop-nav" aria-label="Primary">
          {NAV.map((n) => {
            if (n.isMegaMenu) {
              return (
                <div key={n.label} className="nav-item-dropdown">
                  <button
                    type="button"
                    className={`nav-dropdown-btn${servicesOpen ? ' active' : ''}`}
                    onClick={toggleServices}
                    aria-expanded={servicesOpen}
                    aria-haspopup="true"
                    aria-controls="servicesMegaMenu"
                  >
                    <span>{n.label}</span>
                    <svg
                      className={`nav-dropdown-chevron${servicesOpen ? ' open' : ''}`}
                      viewBox="0 0 10 6"
                      width="9"
                      height="6"
                      aria-hidden="true"
                    >
                      <path
                        d="M1 1L5 5L9 1"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </button>
                </div>
              )
            }
            return (
              <Link key={n.label} to={n.path} onClick={() => setServicesOpen(false)}>
                {n.label}
              </Link>
            )
          })}
        </nav>

        <button className="header-cta" type="button" onClick={() => { closeAllMenus(); openQuote() }}>
          Free Quote
        </button>

        <button
          className={`menu-btn${menuOpen ? ' open' : ''}`}
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((o) => !o)
            setServicesOpen(false)
          }}
        >
          <span /><span /><span />
        </button>

        {/* Desktop Services Mega-Menu Dropdown */}
        <div
          ref={megaMenuRef}
          id="servicesMegaMenu"
          className={`services-megamenu${servicesOpen ? ' open' : ''}`}
          aria-hidden={!servicesOpen}
        >
          <div className="megamenu-inner">
            <div className="megamenu-grid">
              {/* LEFT — RESIDENTIAL */}
              <div className="megamenu-column residential-column">
                <div className="megamenu-col-header">
                  <div className="megamenu-col-tag">
                    <span className="megamenu-badge-dot" />
                    <h3>RESIDENTIAL</h3>
                  </div>
                  <Link
                    to="/residential"
                    className="megamenu-view-all"
                    onClick={closeAllMenus}
                  >
                    View all residential <span>→</span>
                  </Link>
                </div>

                <div className="megamenu-list">
                  {residentialServices.map((s) => (
                    <Link
                      key={s.id}
                      to={`/service?id=${s.id}`}
                      className="megamenu-item"
                      onClick={closeAllMenus}
                    >
                      <div className="megamenu-item-content">
                        <div className="megamenu-item-title-row">
                          <span className="megamenu-item-title">{s.title}</span>
                          {s.badge.includes('Specialised') && (
                            <span className="megamenu-item-pill">Specialised</span>
                          )}
                        </div>
                        <p className="megamenu-item-desc">{s.short}</p>
                      </div>
                      <span className="megamenu-item-arrow" aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Subtle Vertical Divider */}
              <div className="megamenu-divider" aria-hidden="true" />

              {/* RIGHT — COMMERCIAL */}
              <div className="megamenu-column commercial-column">
                <div className="megamenu-col-header">
                  <div className="megamenu-col-tag">
                    <span className="megamenu-badge-dot" />
                    <h3>COMMERCIAL</h3>
                  </div>
                  <Link
                    to="/commercial"
                    className="megamenu-view-all"
                    onClick={closeAllMenus}
                  >
                    View all commercial <span>→</span>
                  </Link>
                </div>

                <div className="megamenu-list">
                  {commercialServices.map((s) => (
                    <Link
                      key={s.id}
                      to={`/service?id=${s.id}`}
                      className="megamenu-item"
                      onClick={closeAllMenus}
                    >
                      <div className="megamenu-item-content">
                        <div className="megamenu-item-title-row">
                          <span className="megamenu-item-title">{s.title}</span>
                        </div>
                        <p className="megamenu-item-desc">{s.short}</p>
                      </div>
                      <span className="megamenu-item-arrow" aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Mega-Menu Quick Footer Banner */}
            <div className="megamenu-footer">
              <div className="megamenu-footer-info">
                <span className="megamenu-footer-icon">◆</span>
                <span>Licensed Building Practitioners &bull; 10-Year Workmanship Warranty &bull; Free On-Site Assessments</span>
              </div>
              <button
                type="button"
                className="megamenu-footer-btn"
                onClick={() => {
                  closeAllMenus()
                  openQuote()
                }}
              >
                Request a quote →
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Panel */}
      <div className={`mobile-nav${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen}>
        <div className="mobile-nav-scroll">
          <nav aria-label="Mobile Navigation">
            <Link to="/" onClick={closeAllMenus}>Home</Link>

            {/* Mobile Services Collapsible / Categorized Section */}
            <div className="mobile-services-section">
              <button
                type="button"
                className="mobile-services-toggle"
                onClick={() => setMobileServicesExpanded((prev) => !prev)}
                aria-expanded={mobileServicesExpanded}
              >
                <span>Services</span>
                <span className={`mobile-chevron${mobileServicesExpanded ? ' open' : ''}`}>▼</span>
              </button>

              {mobileServicesExpanded && (
                <div className="mobile-services-accordion">
                  {/* RESIDENTIAL */}
                  <div className="mobile-services-group">
                    <div className="mobile-services-group-head">
                      <span className="mobile-group-label">RESIDENTIAL</span>
                      <Link
                        to="/residential"
                        className="mobile-group-all-link"
                        onClick={closeAllMenus}
                      >
                        All Residential →
                      </Link>
                    </div>
                    <div className="mobile-services-sublist">
                      {residentialServices.map((s) => (
                        <Link
                          key={s.id}
                          to={`/service?id=${s.id}`}
                          className="mobile-service-link"
                          onClick={closeAllMenus}
                        >
                          <span className="mobile-service-name">{s.title}</span>
                          <span className="mobile-service-arrow">→</span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* COMMERCIAL */}
                  <div className="mobile-services-group">
                    <div className="mobile-services-group-head">
                      <span className="mobile-group-label">COMMERCIAL</span>
                      <Link
                        to="/commercial"
                        className="mobile-group-all-link"
                        onClick={closeAllMenus}
                      >
                        All Commercial →
                      </Link>
                    </div>
                    <div className="mobile-services-sublist">
                      {commercialServices.map((s) => (
                        <Link
                          key={s.id}
                          to={`/service?id=${s.id}`}
                          className="mobile-service-link"
                          onClick={closeAllMenus}
                        >
                          <span className="mobile-service-name">{s.title}</span>
                          <span className="mobile-service-arrow">→</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link to="/#projects" onClick={closeAllMenus}>Projects</Link>
            <Link to="/#process" onClick={closeAllMenus}>Process</Link>
            <Link to="/#about" onClick={closeAllMenus}>About</Link>
            <Link to="/#faq" onClick={closeAllMenus}>FAQ</Link>
            <Link to="/contact" onClick={closeAllMenus}>Contact Us</Link>
          </nav>

          <button
            className="outline-btn"
            type="button"
            onClick={() => {
              closeAllMenus()
              openQuote()
            }}
          >
            Get a free quote <span>→</span>
          </button>
        </div>
      </div>
    </>
  )
}
