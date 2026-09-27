import { Link } from 'react-router-dom'
import { SERVICES } from '../../data/services'

const commercial = SERVICES.filter((s) => s.badge.startsWith('Commercial'))
const residential = SERVICES.filter((s) => !s.badge.startsWith('Commercial'))

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-company">
        <Link to="/">
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
            <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M14 8h3V4h-3c-2.2 0-4 1.8-4 4v2H7v4h3v6h4v-6h3l1-4h-4V8z" /></svg></a>
            <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle className="social-dot" cx="17.2" cy="6.8" r="1" /></svg></a>
            <a href="#" aria-label="LinkedIn"><svg viewBox="0 0 24 24"><path d="M6 9v11H3V9h3zM4.5 4a1.8 1.8 0 110 3.6 1.8 1.8 0 010-3.6zM10 9h3v1.7c.6-1 1.8-2 3.6-2 2.8 0 4.4 1.7 4.4 5V20h-3.3v-5.6c0-1.6-.6-2.6-2-2.6-1.5 0-2.4 1-2.4 2.9V20H10V9z" /></svg></a>
          </div>
        </div>
      </div>

      <div className="footer-column">
        <h3>Commercial</h3>
        <nav>
          {commercial.map((s) => (
            <Link key={s.id} to={`/service?id=${s.id}`}>{s.title}</Link>
          ))}
        </nav>
      </div>

      <div className="footer-column">
        <h3>Residential</h3>
        <nav>
          {residential.map((s) => (
            <Link key={s.id} to={`/service?id=${s.id}`}>
              {s.title}{s.badge.includes('Specialised') ? <em> (specialised)</em> : null}
            </Link>
          ))}
        </nav>
        <h3 className="footer-subhead">Company</h3>
        <nav>
          <Link to="/#about">About us</Link>
          <Link to="/#projects">Projects</Link>
          <Link to="/#process">Process</Link>
          <Link to="/#faq">FAQ</Link>
        </nav>
      </div>

      <div className="footer-column footer-contact" id="footer-contact">
        <h3>Contact</h3>
        <address>
          <span>Office</span>
          <p>59 Porana Road, Glenfield,<br />Auckland 0627, New Zealand</p>
          <span>Phone</span>
          <a className="contact-strong contact-action" href="tel:+64800555766" aria-label="Call Auckland Roof Professionals on 0800 555 766">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7.1 3.5 9.4 8 7.7 9.7a15.2 15.2 0 0 0 6.6 6.6l1.7-1.7 4.5 2.3-1 3.1c-.3.8-1 1.3-1.8 1.3A15 15 0 0 1 2.7 6.3c0-.8.5-1.5 1.3-1.8l3.1-1Z" />
            </svg>
            <span>0800 555 766</span>
          </a>
          <span>Email</span>
          <a className="contact-strong contact-action" href="mailto:info@aucklandroofprofessionals.nz" aria-label="Email Auckland Roof Professionals">
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
    </footer>
  )
}
