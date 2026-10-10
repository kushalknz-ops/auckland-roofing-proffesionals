import { useState, useRef, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { SERVICE_OPTION_GROUPS, OTHER_OPTION } from '../data/service-options'
import {
  validateContactForm,
  validateName,
  validateEmail,
  validatePhone,
  validateService,
  validateDetails,
  type ContactFormData,
  type ContactFormErrors,
} from '../lib/validation'
import { useSEO } from '../hooks/useSEO'
import '../contact.css'

export default function ContactPage() {
  useSEO({
    title: 'Contact Auckland Roof Professionals | Free Roof Quotes & Emergencies',
    description: 'Contact our Auckland roofing team for free assessments, quotes and rapid leak assistance. Call 0800 555 766 or visit 59 Porana Rd, Glenfield.',
    canonical: '/contact',
    ogImage: '/assets/img/about.jpg',
    keywords: 'contact Auckland roofers, roofing quotes Auckland, emergency roof repair Auckland, Glenfield roofer, commercial roof inspection, residential roof quote',
  })

  const [data, setData] = useState<ContactFormData>({
    fullName: '',
    email: '',
    phone: '',
    service: '',
    message: '',
    _hp: '',
  })
  const [errors, setErrors] = useState<ContactFormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Refs for accessible focus management
  const fullNameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const serviceRef = useRef<HTMLSelectElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  const validateField = (field: keyof ContactFormData, value: string): string | null => {
    switch (field) {
      case 'fullName':
        return validateName(value, 'Full name')
      case 'email':
        return validateEmail(value)
      case 'phone':
        return validatePhone(value, false)
      case 'service':
        return validateService(value)
      case 'message':
        return validateDetails(value, 10, 2000, 'Your message')
      default:
        return null
    }
  }

  const handleBlur = (field: keyof ContactFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const fieldError = validateField(field, data[field] || '')
    setErrors((prev) => ({ ...prev, [field]: fieldError || undefined }))
  }

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }))
    if (serverError) setServerError(null)

    // If already touched or has error, re-validate immediately for smooth UX
    if (touched[field] || errors[field]) {
      const fieldError = validateField(field, value)
      setErrors((prev) => ({ ...prev, [field]: fieldError || undefined }))
    }
  }

  const focusFirstError = (validationErrors: ContactFormErrors) => {
    if (validationErrors.fullName) {
      fullNameRef.current?.focus()
    } else if (validationErrors.email) {
      emailRef.current?.focus()
    } else if (validationErrors.phone) {
      phoneRef.current?.focus()
    } else if (validationErrors.service) {
      serviceRef.current?.focus()
    } else if (validationErrors.message) {
      messageRef.current?.focus()
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)

    // 1. Client-side validation
    const { isValid, errors: clientErrors } = validateContactForm(data)
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      service: true,
      message: true,
    })

    if (!isValid) {
      setErrors(clientErrors)
      focusFirstError(clientErrors)
      return
    }

    // 2. Server-side submission & validation
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await res.json().catch(() => null)

      if (res.ok && result?.success) {
        setSubmitted(true)
        setErrors({})
      } else if (res.status === 400 && result?.errors) {
        // Server validation failed
        setErrors(result.errors)
        setServerError(result.message || 'Please fix the highlighted errors below.')
        focusFirstError(result.errors)
      } else if (res.status === 429) {
        setServerError('Too many submissions. Please wait a few moments or call us directly at 0800 555 766.')
      } else {
        setServerError(result?.message || 'Something went wrong submitting your message. Please try again or call 0800 555 766.')
      }
    } catch {
      setServerError('Unable to connect to the server. Please check your connection or call us at 0800 555 766.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setData({
      fullName: '',
      email: '',
      phone: '',
      service: '',
      message: '',
      _hp: '',
    })
    setErrors({})
    setTouched({})
    setServerError(null)
    setSubmitted(false)
  }

  return (
    <main className="contact-page">
      {/* ============ 1. CONTACT PAGE HERO ============ */}
      <section className="contact-hero">
        <div className="contact-hero-media" aria-hidden="true" />
        <div className="contact-hero-shade" aria-hidden="true" />
        <div className="container contact-hero-inner">
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
        <div className="container contact-main-grid">
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
              <form className="contact-form-fields" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
                {/* Server Error Alert Banner */}
                {serverError && (
                  <div className="contact-form-alert" role="alert" aria-live="assertive">
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flex: 1 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>Submission Issue</strong>
                        <span>{serverError}</span>
                        <div style={{ marginTop: '8px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={(e) => handleSubmit(e as unknown as FormEvent)}
                            disabled={isSubmitting}
                            style={{
                              padding: '4px 10px',
                              background: '#C54E4E',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isSubmitting ? 'Retrying...' : 'Retry Sending'}
                          </button>
                          <a
                            href="tel:0800555766"
                            style={{ color: '#942C2C', fontSize: '11px', fontWeight: 600, textDecoration: 'underline' }}
                          >
                            Or Call 0800 555 766
                          </a>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setServerError(null)}
                      aria-label="Dismiss error"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#942C2C',
                        cursor: 'pointer',
                        fontSize: '18px',
                        lineHeight: 1,
                        padding: '0 4px',
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Honeypot anti-spam field */}
                <div style={{ display: 'none' }} aria-hidden="true">
                  <input
                    type="text"
                    name="_hp"
                    value={data._hp || ''}
                    onChange={(e) => handleChange('_hp', e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div className="contact-form-row">
                  <div className="contact-field-group">
                    <label htmlFor="fullName">
                      Full Name <span className="req">*</span>
                    </label>
                    <input
                      ref={fullNameRef}
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. John Doe"
                      value={data.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      onBlur={() => handleBlur('fullName')}
                      className={errors.fullName ? 'has-error' : ''}
                      aria-invalid={!!errors.fullName}
                      aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                      disabled={isSubmitting}
                    />
                    {errors.fullName && (
                      <span id="fullName-error" className="contact-field-error" role="alert">
                        {errors.fullName}
                      </span>
                    )}
                  </div>

                  <div className="contact-field-group">
                    <label htmlFor="email">
                      Email Address <span className="req">*</span>
                    </label>
                    <input
                      ref={emailRef}
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="e.g. john@example.co.nz"
                      value={data.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      className={errors.email ? 'has-error' : ''}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <span id="email-error" className="contact-field-error" role="alert">
                        {errors.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="contact-form-row">
                  <div className="contact-field-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      ref={phoneRef}
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="e.g. 021 123 4567"
                      value={data.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')}
                      className={errors.phone ? 'has-error' : ''}
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? 'phone-error' : undefined}
                      disabled={isSubmitting}
                    />
                    {errors.phone && (
                      <span id="phone-error" className="contact-field-error" role="alert">
                        {errors.phone}
                      </span>
                    )}
                  </div>

                  <div className="contact-field-group">
                    <label htmlFor="service">
                      Service Required <span className="req">*</span>
                    </label>
                    <select
                      ref={serviceRef}
                      id="service"
                      value={data.service}
                      onChange={(e) => handleChange('service', e.target.value)}
                      onBlur={() => handleBlur('service')}
                      className={errors.service ? 'has-error' : ''}
                      aria-invalid={!!errors.service}
                      aria-describedby={errors.service ? 'service-error' : undefined}
                      disabled={isSubmitting}
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
                      <span id="service-error" className="contact-field-error" role="alert">
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
                    ref={messageRef}
                    id="message"
                    rows={4}
                    maxLength={2000}
                    placeholder="Describe your roof condition, goals or any urgent requirements..."
                    value={data.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    onBlur={() => handleBlur('message')}
                    className={errors.message ? 'has-error' : ''}
                    aria-invalid={!!errors.message}
                    aria-describedby={errors.message ? 'message-error' : undefined}
                    disabled={isSubmitting}
                  />
                  {errors.message ? (
                    <span id="message-error" className="contact-field-error" role="alert">
                      {errors.message}
                    </span>
                  ) : (
                    <small style={{ color: 'var(--muted2-l)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {data.message.length.toLocaleString()}/2,000 characters (minimum 10)
                    </small>
                  )}
                </div>

                <button
                  type="submit"
                  className="contact-submit-btn"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="contact-spinner" aria-hidden="true" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <span>→</span>
                    </>
                  )}
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
                src="https://www.google.com/maps?q=59+Porana+Road,+Glenfield,+Auckland+0627,+New+Zealand&t=&z=14&ie=UTF8&iwloc=&output=embed"
                style={{ border: 0 }}
                allowFullScreen
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
        <div className="container emergency-cta-inner reveal">
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
