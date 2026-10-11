import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SERVICES } from '../../data/services'

const commercial = SERVICES.filter((s) => s.badge.startsWith('Commercial'))
const residential = SERVICES.filter((s) => !s.badge.startsWith('Commercial'))

export function Footer() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (pathname === '/') {
      if (window.location.hash) {
        navigate('/', { replace: true })
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    } else {
      navigate('/')
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    }
  }

  const handleNavClick = (path: string) => (e: React.MouseEvent) => {
    if (path.startsWith('/#') && pathname === '/') {
      const targetId = path.slice(2)
      const el = document.getElementById(targetId)
      if (el) {
        e.preventDefault()
        navigate(path)
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-company">
          <Link to="/" onClick={handleHomeClick} aria-label="Auckland Roof Professionals — home">
            <img src="/assets/logo-full.png" alt="Auckland Roof Professionals" className="footer-logo" />
          </Link>
          <p>Commercial and residential roofing specialists, delivering reliable, durable roofing systems across Tāmaki Makaurau — Auckland.</p>
          <div className="footer-credentials">
            <i>◆</i>
            <span>Licensed Building Practitioners<br />Site Safe Certified<br />Fully insured</span>
          </div>
          <div className="footer-socials">
            <span>Follow us</span>
            <div>
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook (opens in new tab)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-2.2 0-4 1.8-4 4v2H7v4h3v6h4v-6h3l1-4h-4V8z" /></svg></a>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram (opens in new tab)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg></a>
              <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn (opens in new tab)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9v11H3V9h3zM4.5 4a1.8 1.8 0 110 3.6 1.8 1.8 0 010-3.6zM10 9h3v1.7c.6-1 1.8-2 3.6-2 2.8 0 4.4 1.7 4.4 5V20h-3.3v-5.6c0-1.6-.6-2.6-2-2.6-1.5 0-2.4 1-2.4 2.9V20H10V9z" /></svg></a>
            </div>
          </div>
        </div>

        <div className="footer-column">
          <h3><Link to="/commercial">Commercial</Link></h3>
          <nav aria-label="Commercial roofing services">
            {commercial.map((s) => (
              <Link key={s.id} to={`/service?id=${s.id}`}>{s.title}</Link>
            ))}
          </nav>
        </div>

        <div className="footer-column">
          <h3><Link to="/residential">Residential</Link></h3>
          <nav aria-label="Residential roofing services">
            {residential.map((s) => (
              <Link key={s.id} to={`/service?id=${s.id}`}>
                {s.title}{s.badge.includes('Specialised') ? <em> (specialised)</em> : null}
              </Link>
            ))}
          </nav>
        </div>

        <div className="footer-column">
          <h3>Company</h3>
          <nav aria-label="Company navigation">
            <Link to="/#about" onClick={handleNavClick('/#about')}>About us</Link>
            <Link to="/#projects" onClick={handleNavClick('/#projects')}>Projects</Link>
            <Link to="/#process" onClick={handleNavClick('/#process')}>Process</Link>
            <Link to="/#faq" onClick={handleNavClick('/#faq')}>FAQ</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>

        <div className="footer-column footer-contact" id="footer-contact">
          <h3>Contact</h3>
          <address>
            <span>Office</span>
            <p>
              <a
                href="https://maps.app.goo.gl/CKoTxUWEz61N48q18"
                target="_blank"
                rel="noopener noreferrer"
              >
                59 Porana Road, Glenfield,<br />Auckland 0627, New Zealand
              </a>
            </p>
            <span>Phone</span>
            <a className="contact-strong contact-action" href="tel:+64800555766" aria-label="Call 0800 555 766">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.1 3.5 9.4 8 7.7 9.7a15.2 15.2 0 0 0 6.6 6.6l1.7-1.7 4.5 2.3-1 3.1c-.3.8-1 1.3-1.8 1.3A15 15 0 0 1 2.7 6.3c0-.8.5-1.5 1.3-1.8l3.1-1Z" />
              </svg>
              <span>0800 555 766</span>
            </a>
            <span>Email</span>
            <a className="contact-strong contact-action" href="mailto:info@aucklandroofprofessionals.nz" aria-label="Email info@aucklandroofprofessionals.nz">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 5.5h18v13H3z" />
                <path d="m4 7 8 6 8-6" />
              </svg>
              <span>info@aucklandroofprofessionals.nz</span>
            </a>
          </address>
        </div>


        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Auckland Roof Professionals Ltd. All rights reserved.</span>
          <button className="back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to top ↑
          </button>
        </div>
      </div>
    </footer>
  )
}
