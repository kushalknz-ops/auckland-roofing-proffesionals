import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { SERVICE_OPTION_GROUPS, OTHER_OPTION } from '../data/service-options'
import '../contact.css'

interface ContactFormData {
  fullName: string
  email: string
  phone: string
  service: string
  message: string
}

type Errors = Partial<Record<keyof ContactFormData, string>>

export default function ContactPage() {
  const [data, setData] = useState<ContactFormData>({
    fullName: '',
    email: '',
    phone: '',
    service: '',
    message: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const nextErrors: Errors = {}
    if (!data.fullName.trim()) {
      nextErrors.fullName = 'Please enter your full name.'
    }
    if (!data.email.trim()) {
      nextErrors.email = 'Please enter your email address.'
    } else if (!/^\S+@\S+\.\S+$/.test(data.email)) {
      nextErrors.email = 'Please enter a valid email address.'
    }
    if (!data.service) {
      nextErrors.service = 'Please select a service.'
    }
    if (!data.message.trim()) {
      nextErrors.message = 'Please enter your message.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitted(true)
  }

  const handleReset = () => {
    setData({
      fullName: '',
      email: '',
      phone: '',
      service: '',
      message: '',
    })
    setErrors({})
    setSubmitted(false)
  }

  return (
    <main className="contact-page">
      {/* ============ 1. CONTACT PAGE HERO ============ */}
      <section className="contact-hero">
        <div className="contact-hero-media" aria-hidden="true" />
        <div className="contact-hero-shade" aria-hidden="true" />
        <div className="contact-hero-inner">
          <nav className="contact-crumbs reveal" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <b>Contact Us</b>
          </nav>
          <h1 className="reveal">Get In Touch</h1>
        </div>
      </section>

      {/* ============ 2. MAIN CONTACT SECTION ============ */}
      <section className="contact-main-section">
        <div className="contact-main-grid">
          {/* LEFT: SEND US A MESSAGE FORM */}
          <div className="contact-form-card reveal">
            <div className="contact-form-header">
              <h2>Send Us a Message</h2>
              <p>Have a question about your roofing project? Tell us what you need and our team will be in touch.</p>
            </div>

            {submitted ? (
              <div className="contact-form-success" role="status">
                <div className="success-icon" aria-hidden="true">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3>Message Sent!</h3>
                <p>Thank you, <strong>{data.fullName}</strong>. We've received your enquiry and our team will get in touch within 1 business hour.</p>
                <button type="button" className="contact-submit-btn contact-reset-btn" onClick={handleReset}>
                  Send another message
                </button>
              </div>
            ) : (
              <form className="contact-form-fields" onSubmit={handleSubmit} noValidate>
                <div className="contact-form-row">
                  <div className="contact-field-group">
                    <label htmlFor="fullName">
                      Full Name <span className="req">*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. John Doe"
                      value={data.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      className={errors.fullName ? 'has-error' : ''}
                      aria-invalid={!!errors.fullName}
                      aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                    />
                    {errors.fullName && (
                      <span id="fullName-error" className="contact-field-error">
                        {errors.fullName}
                      </span>
                    )}
                  </div>

                  <div className="contact-field-group">
                    <label htmlFor="email">
                      Email Address <span className="req">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="e.g. john@example.co.nz"
                      value={data.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={errors.email ? 'has-error' : ''}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                    />
                    {errors.email && (
                      <span id="email-error" className="contact-field-error">
                        {errors.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="contact-form-row">
                  <div className="contact-field-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="e.g. 021 123 4567"
                      value={data.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  </div>

                  <div className="contact-field-group">
                    <label htmlFor="service">
                      Service Required <span className="req">*</span>
                    </label>
                    <select
                      id="service"
                      value={data.service}
                      onChange={(e) => handleChange('service', e.target.value)}
                      className={errors.service ? 'has-error' : ''}
                      aria-invalid={!!errors.service}
                      aria-describedby={errors.service ? 'service-error' : undefined}
                    >
                      <option value="">Select a roofing service</option>
                      {SERVICE_OPTION_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      <option value={OTHER_OPTION}>{OTHER_OPTION}</option>
                    </select>
                    {errors.service && (
                      <span id="service-error" className="contact-field-error">
                        {errors.service}
                      </span>
                    )}
                  </div>
                </div>

                <div className="contact-field-group contact-field-group--message">
                  <label htmlFor="message">
                    Your Message <span className="req">*</span>
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder="Describe your roof condition, goals or any urgent requirements..."
                    value={data.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    className={errors.message ? 'has-error' : ''}
                    aria-invalid={!!errors.message}
                    aria-describedby={errors.message ? 'message-error' : undefined}
                  />
                  {errors.message && (
                    <span id="message-error" className="contact-field-error">
                      {errors.message}
                    </span>
                  )}
                </div>

                <button type="submit" className="contact-submit-btn">
                  Send Message <span>→</span>
                </button>
              </form>
            )}
          </div>

          {/* RIGHT TOP: CONTACT DETAILS CARD */}
          <div className="contact-details-card reveal">
            <h2>Our Contact Details</h2>
            <ul className="contact-info-list">
              <li className="contact-info-item">
                <div className="contact-info-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="contact-info-content">
                  <span className="contact-info-label">Workshop / Office Address</span>
                  <span className="contact-info-value">
                    <a
                      href="https://maps.app.goo.gl/CKoTxUWEz61N48q18"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      59 Porana Road, Glenfield, Auckland 0627, New Zealand
                    </a>
                  </span>
                </div>
              </li>

              <li className="contact-info-item">
                <div className="contact-info-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div className="contact-info-content">
                  <span className="contact-info-label">Phone</span>
                  <span className="contact-info-value">
                    <a href="tel:0800555766">0800 555 766</a>
                  </span>
                </div>
              </li>

              <li className="contact-info-item">
                <div className="contact-info-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <div className="contact-info-content">
                  <span className="contact-info-label">Email</span>
                  <span className="contact-info-value">
                    <a href="mailto:info@aucklandroofprofessionals.nz">info@aucklandroofprofessionals.nz</a>
                  </span>
                </div>
              </li>

              <li className="contact-info-item">
                <div className="contact-info-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="contact-info-content">
                  <span className="contact-info-label">Operating Hours</span>
                  <span className="contact-info-value">Mon–Fri: 7:30am–5:00pm</span>
                  <span className="contact-info-sub">Saturday: By appointment only</span>
                </div>
              </li>
            </ul>
          </div>

          {/* RIGHT BOTTOM: AUCKLAND SERVICE AREA MAP */}
          <div className="contact-map-card reveal">
            <p className="contact-map-label">Auckland Service Area</p>
            <div className="contact-map-wrap">
              <iframe
                className="contact-map-iframe"
                title="Auckland Roof Professionals Workshop Location"
                src="https://maps.google.com/maps?q=59+Porana+Road,+Glenfield,+Auckland+0627,+New+Zealand&t=&z=14&ie=UTF8&iwloc=&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                aria-label="Google Maps showing workshop at 59 Porana Road, Glenfield, Auckland"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============ 4. EMERGENCY CTA SECTION ============ */}
      <section className="emergency-cta-band">
        <div className="emergency-cta-inner reveal">
          <div className="emergency-cta-copy">
            <h2>Roof Emergency? Call Us Now</h2>
            <p>Leak or urgent roof damage? Contact our team for rapid assistance.</p>
          </div>
          <a href="tel:0800555766" className="emergency-phone-btn" aria-label="Emergency roof assistance: Call 0800 555 766">
            <svg className="emergency-phone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>0800 555 766</span>
          </a>
        </div>
      </section>
    </main>
  )
}
