import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuote } from './quote-context'

const NAV = [
  { label: 'Home', hash: '' },
  { label: 'Services', hash: '#services' },
  { label: 'Projects', hash: '#projects' },
  { label: 'Process', hash: '#process' },
  { label: 'About', hash: '#about' },
  { label: 'FAQ', hash: '#faq' },
  { label: 'Contact Us', hash: '#footer-contact' },
]

/**
 * Fixed site header. Transparent over the hero; once scrolled (scrollY > 40)
 * it gains the `.scrolled` state — which, on desktop, shows the liquid-glass
 * layers (blur + SVG distortion + white tint + inset highlights) ported from
 * components/ui/liquid-glass.tsx. Mobile keeps the solid bar (glass CSS is
 * desktop-only in arp.css).
 */
export function Header() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { openQuote } = useQuote()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* close + unlock scroll when route changes */
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

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

  const link = (hash: string) => (pathname === '/' ? `/${hash}` : `/${hash}`)

  return (
    <>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`} id="siteHeader">
        {/* liquid-glass layers — shown only when .scrolled on >=901px (see arp.css) */}
        <div className="header-glass" aria-hidden="true">
          <div className="hg-layer hg-distort" />
          <div className="hg-layer hg-tint" />
          <div className="hg-layer hg-highlight" />
        </div>

        <Link className="brand" to="/" aria-label="Auckland Roof Professionals — home">
          <img src="/assets/logo-full.png" alt="Auckland Roof Professionals" className="brand-logo brand-logo--light" />
          <img src="/assets/logo-navy.png" alt="" className="brand-logo brand-logo--navy" aria-hidden="true" />
        </Link>

        <nav className="desktop-nav" aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.hash} to={link(n.hash)}>{n.label}</Link>
          ))}
        </nav>

        <button className="header-cta" type="button" onClick={() => openQuote()}>
          Free Quote
        </button>

        <button
          className={`menu-btn${menuOpen ? ' open' : ''}`}
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>
      </header>

      <div className={`mobile-nav${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen}>
        <nav>
          {NAV.map((n) => (
            <Link key={n.label} to={link(n.hash)} onClick={() => setMenuOpen(false)}>{n.label}</Link>
          ))}
        </nav>
        <button className="outline-btn" type="button" onClick={() => { setMenuOpen(false); openQuote() }}>
          Get a free quote <span>→</span>
        </button>
      </div>
    </>
  )
}
