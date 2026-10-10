import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { OTHER_OPTION, SERVICE_OPTION_GROUPS, optionValueForService } from '../../data/service-options'
import {
  validateName,
  validateEmail,
  validatePhone,
  validateLocation,
  validateService,
  validateDetails,
  validateSingleFile,
  MAX_FILES_ALLOWED,
  type RoofingEnquiryErrors,
} from '../../lib/validation'

type Step = 1 | 2 | 3

interface FormDataState {
  property: string
  service: string
  location: string
  timeframe: string
  details: string
  name: string
  email: string
  phone: string
  contactMethod: string
  additionalNotes: string
  files: File[]
  _hp: string
}

const PROPERTY_OPTIONS = [
  { value: 'home', title: 'A home', description: 'Homeowners & residential projects', icon: 'home' },
  { value: 'business', title: 'A business', description: 'Commercial buildings & premises', icon: 'building' },
  { value: 'portfolio', title: 'A property portfolio', description: 'Several roofs or buildings', icon: 'layers' },
  { value: 'other', title: 'Another property type', description: 'Industrial, school, church or another property', icon: 'other' },
]

function PropertyIcon({ type }: { type: string }) {
  if (type === 'home') return <svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>
  if (type === 'building') return <svg viewBox="0 0 24 24"><path d="M4 21V8h10v13M14 12h6v9M8 12h2M8 16h2M8 20h2M17 16h1M17 19h1"/></svg>
  if (type === 'layers') return <svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>
  return <svg viewBox="0 0 24 24"><path d="M4 20h16M6 20V9l6-5 6 5v11M9 12h6M9 16h6"/></svg>
}

export function RoofingEnquiryForm({ initialService, onSuccess }: { initialService?: string | null; onSuccess?: () => void }) {
  const [step, setStep] = useState<Step>(1)
  const [sent, setSent] = useState(false)
  const [errors, setErrors] = useState<RoofingEnquiryErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [fileError, setFileError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const [data, setData] = useState<FormDataState>(() => ({
    property: 'home',
    service: initialService ? optionValueForService(initialService) : '',
    location: '',
    timeframe: 'Not sure yet',
    details: '',
    name: '',
    email: '',
    phone: '',
    contactMethod: 'Email',
    additionalNotes: '',
    files: [],
    _hp: '',
  }))

  const panelRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Accessible element refs for auto-focusing invalid inputs
  const serviceRef = useRef<HTMLSelectElement>(null)
  const locationRef = useRef<HTMLInputElement>(null)
  const detailsRef = useRef<HTMLTextAreaElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  const update = (key: keyof FormDataState, value: string | File[]) => {
    setData((d) => ({ ...d, [key]: value }))
    if (serverError) setServerError(null)

    // Re-validate if touched
    if (touched[key] || errors[key as keyof RoofingEnquiryErrors]) {
      const fieldError = validateSingleField(key, value)
      setErrors((e) => ({ ...e, [key]: fieldError || undefined }))
    }
  }

  const handleBlur = (field: keyof FormDataState) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const fieldError = validateSingleField(field, data[field])
    setErrors((prev) => ({ ...prev, [field]: fieldError || undefined }))
  }

  const validateSingleField = (key: keyof FormDataState, value: string | File[]): string | null => {
    if (typeof value !== 'string') return null
    switch (key) {
      case 'service':
        return validateService(value)
      case 'location':
        return validateLocation(value)
      case 'details':
        return validateDetails(value, 10, 2000, 'Project description')
      case 'name':
        return validateName(value, 'Name')
      case 'email':
        return validateEmail(value)
      case 'phone':
        return validatePhone(value, true)
      default:
        return null
    }
  }

  const goTo = (next: Step) => {
    setStep(next)
    setServerError(null)
    requestAnimationFrame(() => panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  const validateProjectStep = (): boolean => {
    const nextErrors: RoofingEnquiryErrors = {}
    setTouched((prev) => ({ ...prev, service: true, location: true, details: true }))

    const sErr = validateService(data.service)
    if (sErr) nextErrors.service = sErr

    const lErr = validateLocation(data.location)
    if (lErr) nextErrors.location = lErr

    const dErr = validateDetails(data.details, 10, 2000, 'Work details')
    if (dErr) nextErrors.details = dErr

    setErrors((prev) => ({ ...prev, ...nextErrors }))

    if (nextErrors.service) {
      serviceRef.current?.focus()
      return false
    }
    if (nextErrors.location) {
      locationRef.current?.focus()
      return false
    }
    if (nextErrors.details) {
      detailsRef.current?.focus()
      return false
    }

    return true
  }

  const validateContactStep = (): boolean => {
    const nextErrors: RoofingEnquiryErrors = {}
    setTouched((prev) => ({ ...prev, name: true, email: true, phone: true }))

    const nErr = validateName(data.name, 'Name')
    if (nErr) nextErrors.name = nErr

    const eErr = validateEmail(data.email)
    if (eErr) nextErrors.email = eErr

    const pErr = validatePhone(data.phone, true)
    if (pErr) nextErrors.phone = pErr

    setErrors((prev) => ({ ...prev, ...nextErrors }))

    if (nextErrors.name) {
      nameRef.current?.focus()
      return false
    }
    if (nextErrors.email) {
      emailRef.current?.focus()
      return false
    }
    if (nextErrors.phone) {
      phoneRef.current?.focus()
      return false
    }

    return true
  }

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const incoming = Array.from(event.target.files ?? [])
    if (!incoming.length) return

    const combined = [...data.files, ...incoming]
    if (combined.length > MAX_FILES_ALLOWED) {
      setFileError(`You can attach up to ${MAX_FILES_ALLOWED} photos total. Excess files were ignored.`)
    }

    const nextFiles: File[] = []
    let hasInvalid = false

    for (const file of combined.slice(0, MAX_FILES_ALLOWED)) {
      const err = validateSingleFile(file)
      if (err) {
        setFileError(err)
        hasInvalid = true
      } else {
        nextFiles.push(file)
      }
    }

    if (!hasInvalid && combined.length <= MAX_FILES_ALLOWED) {
      setFileError(null)
    }

    update('files', nextFiles)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (indexToRemove: number) => {
    const updated = data.files.filter((_, idx) => idx !== indexToRemove)
    update('files', updated)
    setFileError(null)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setServerError(null)

    // Double check both project and contact steps
    if (!validateContactStep()) return

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('property', data.property)
      formData.append('service', data.service)
      formData.append('location', data.location)
      formData.append('timeframe', data.timeframe)
      // Merge details and any additional notes
      const fullDetails = data.additionalNotes
        ? `${data.details}\n\nAdditional notes: ${data.additionalNotes}`
        : data.details
      formData.append('details', fullDetails)
      formData.append('name', data.name)
      formData.append('email', data.email)
      formData.append('phone', data.phone)
      formData.append('contactMethod', data.contactMethod)
      formData.append('_hp', data._hp)

      for (const file of data.files) {
        formData.append('files', file)
      }

      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      })

      const result = await res.json().catch(() => null)

      if (res.ok && result?.success) {
        setSent(true)
        onSuccess?.()
      } else if (res.status === 400 && result?.errors) {
        setErrors(result.errors)
        setServerError(result.message || 'Please correct the highlighted errors.')

        // If error is in Step 2, go back to step 2 so user sees it
        if (result.errors.service || result.errors.location || result.errors.details) {
          goTo(2)
        }
      } else if (res.status === 429) {
        setServerError('Too many submissions. Please wait a few moments or call 0800 555 766.')
      } else {
        setServerError(result?.message || 'Unable to submit enquiry. Please try again or call us at 0800 555 766.')
      }
    } catch {
      setServerError('Network error. Please check your connection or call us directly on 0800 555 766.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setData({
      property: 'home',
      service: initialService ? optionValueForService(initialService) : '',
      location: '',
      timeframe: 'Not sure yet',
      details: '',
      name: '',
      email: '',
      phone: '',
      contactMethod: 'Email',
      additionalNotes: '',
      files: [],
      _hp: '',
    })
    setErrors({})
    setTouched({})
    setServerError(null)
    setFileError(null)
    setSent(false)
    setStep(1)
  }

  if (sent) return (
    <div className="enquiry-success" role="status">
      <span>✓</span><p className="eyebrow eyebrow-dark">Enquiry received</p>
      <h2>Thanks, {data.name}.</h2>
      <p>Our roofing team will be in touch within one business day.</p>
      <button
        type="button"
        className="enquiry-primary"
        style={{ marginTop: '24px' }}
        onClick={handleReset}
      >
        Submit another enquiry <span>→</span>
      </button>
    </div>
  )

  return (
    <div className="enquiry-form" ref={panelRef} aria-busy={isSubmitting}>
      <ol className="enquiry-steps" aria-label={`Step ${step} of 3`}>
        {['Property', 'Project', 'Contact'].map((label, index) => {
          const number = (index + 1) as Step
          return <li key={label} className={number === step ? 'active' : number < step ? 'complete' : ''}>
            <span>{number < step ? '✓' : number}</span><small>{label}</small>
          </li>
        })}
      </ol>

      {/* Server error alert banner with retry & support actions */}
      {serverError && (
        <div className="enquiry-alert" role="alert" aria-live="assertive">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <strong>Submission Error: </strong>{serverError}
            </div>
            <button
              type="button"
              onClick={() => setServerError(null)}
              aria-label="Dismiss error notice"
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
          <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={(e) => {
                if (step === 3) {
                  submit(e as unknown as FormEvent)
                } else {
                  goTo(3)
                }
              }}
              disabled={isSubmitting}
              style={{
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 700,
                background: '#C54E4E',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '3px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Retrying...' : 'Retry submission'}
            </button>
            <a
              href="tel:0800555766"
              style={{ fontSize: '11px', fontWeight: 600, color: '#942C2C', textDecoration: 'underline' }}
            >
              Or call 0800 555 766
            </a>
          </div>
        </div>
      )}

      {step === 1 && <section className="enquiry-step" aria-labelledby="property-title">
        <header><h2 id="property-title">What kind of property is it?</h2><p>Choose the option that best describes your project.</p></header>
        <div className="property-options">
          {PROPERTY_OPTIONS.map((option) => <label key={option.value} className={data.property === option.value ? 'selected' : ''}>
            <input
              type="radio"
              name="property"
              value={option.value}
              checked={data.property === option.value}
              onChange={() => update('property', option.value)}
              disabled={isSubmitting}
            />
            <span className="option-radio" aria-hidden="true" />
            <span className="property-icon"><PropertyIcon type={option.icon} /></span>
            <span className="property-copy"><strong>{option.title}</strong><small>{option.description}</small></span>
          </label>)}
        </div>
        <div className="enquiry-info"><strong>What happens after you enquire?</strong><p>Your details provide a starting point to discuss scope and any assessment needed. A quote or inspection is agreed separately.</p></div>
        <div className="enquiry-actions right">
          <button
            type="button"
            className="enquiry-primary"
            onClick={() => goTo(2)}
            disabled={isSubmitting}
          >
            Continue <span>→</span>
          </button>
        </div>
      </section>}

      {step === 2 && <section className="enquiry-step" aria-labelledby="project-title">
        <header><h2 id="project-title">Tell us about the roofing work.</h2><p>A few details help establish the next step. Fields marked * are required.</p></header>
        <div className="enquiry-fields">
          <label className="full">What do you need help with? *
            <select
              ref={serviceRef}
              value={data.service}
              onChange={(e) => update('service', e.target.value)}
              onBlur={() => handleBlur('service')}
              aria-invalid={!!errors.service}
              aria-describedby={errors.service ? 'service-error' : undefined}
              disabled={isSubmitting}
            >
              <option value="">Select a roofing service</option>
              {SERVICE_OPTION_GROUPS.map((g) => <optgroup key={g.label} label={g.label}>{g.options.map((o) => <option key={o}>{o}</option>)}</optgroup>)}
              <option>{OTHER_OPTION}</option>
            </select>
            {errors.service && <em id="service-error" role="alert">{errors.service}</em>}
          </label>

          <label>Property suburb / location *
            <input
              ref={locationRef}
              value={data.location}
              onChange={(e) => update('location', e.target.value)}
              onBlur={() => handleBlur('location')}
              placeholder="e.g. Mount Eden, Auckland"
              aria-invalid={!!errors.location}
              aria-describedby={errors.location ? 'location-error' : undefined}
              disabled={isSubmitting}
            />
            {errors.location && <em id="location-error" role="alert">{errors.location}</em>}
          </label>

          <label>Your timeframe *
            <select
              value={data.timeframe}
              onChange={(e) => update('timeframe', e.target.value)}
              disabled={isSubmitting}
            >
              <option>Not sure yet</option>
              <option>As soon as possible</option>
              <option>Within 1–3 months</option>
              <option>Within 3–6 months</option>
              <option>Planning ahead</option>
            </select>
          </label>

          <label className="full">A little about the work *
            <textarea
              ref={detailsRef}
              maxLength={2000}
              value={data.details}
              onChange={(e) => update('details', e.target.value)}
              onBlur={() => handleBlur('details')}
              placeholder="What have you noticed, or what are you planning?"
              aria-invalid={!!errors.details}
              aria-describedby={errors.details ? 'details-error' : undefined}
              disabled={isSubmitting}
            />
            {errors.details && <em id="details-error" role="alert">{errors.details}</em>}
            <small className="field-note">{data.details.length.toLocaleString()}/2,000 characters (minimum 10). Include roof type or approximate size if known.</small>
          </label>

          <label className="full upload-label"><span className="upload-title">↥ &nbsp; Add photos (optional)</span>
            <span className="upload-box">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={onFiles}
                aria-label="Upload roof photos"
                disabled={isSubmitting}
              />
              <strong>
                {data.files.length ? `${data.files.length} photo${data.files.length > 1 ? 's' : ''} selected` : 'Choose files or drop photos here'}
              </strong>
              <small>Up to 3 JPG, PNG or WebP photos. Maximum 4 MB each. Only take photos from a safe location.</small>
            </span>
            {fileError && (
              <em role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{fileError}</span>
                <button
                  type="button"
                  onClick={() => setFileError(null)}
                  style={{ background: 'none', border: 'none', color: '#C54E4E', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                  aria-label="Dismiss file error"
                >
                  ×
                </button>
              </em>
            )}
            {errors.files && <em role="alert">{errors.files}</em>}

            {data.files.length > 0 && (
              <div className="upload-chips">
                {data.files.map((file, idx) => (
                  <span key={`${file.name}-${idx}`} className="upload-chip">
                    <span>{file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
                    <button
                      type="button"
                      className="upload-chip-remove"
                      onClick={() => removeFile(idx)}
                      disabled={isSubmitting}
                      aria-label={`Remove photo ${file.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </label>
        </div>

        <div className="enquiry-actions">
          <button type="button" className="enquiry-back" onClick={() => goTo(1)} disabled={isSubmitting}>← &nbsp; Back</button>
          <button type="button" className="enquiry-primary" onClick={() => { if (validateProjectStep()) goTo(3) }} disabled={isSubmitting}>Continue <span>→</span></button>
        </div>
      </section>}

      {step === 3 && <section className="enquiry-step" aria-labelledby="contact-title">
        <header><h2 id="contact-title">Tell us about yourself.</h2><p>Where should our roofing team send your quote and next steps?</p></header>
        <form className="enquiry-fields" onSubmit={submit} noValidate>
          {/* Honeypot */}
          <div style={{ display: 'none' }} aria-hidden="true">
            <input
              type="text"
              name="_hp"
              value={data._hp}
              onChange={(e) => update('_hp', e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <label>Name *
            <input
              ref={nameRef}
              autoComplete="name"
              value={data.name}
              onChange={(e) => update('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="Your name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              disabled={isSubmitting}
            />
            {errors.name && <em id="name-error" role="alert">{errors.name}</em>}
          </label>

          <label>Email *
            <input
              ref={emailRef}
              type="email"
              autoComplete="email"
              value={data.email}
              onChange={(e) => update('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="you@example.co.nz"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              disabled={isSubmitting}
            />
            {errors.email && <em id="email-error" role="alert">{errors.email}</em>}
          </label>

          <label>Phone *
            <input
              ref={phoneRef}
              type="tel"
              autoComplete="tel"
              value={data.phone}
              onChange={(e) => update('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              placeholder="021 000 000"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
              disabled={isSubmitting}
            />
            {errors.phone && <em id="phone-error" role="alert">{errors.phone}</em>}
          </label>

          <label>Preferred contact method
            <select
              value={data.contactMethod}
              onChange={(e) => update('contactMethod', e.target.value)}
              disabled={isSubmitting}
            >
              <option>Email</option>
              <option>Phone</option>
              <option>Text message</option>
            </select>
          </label>

          <label className="full">Additional information (optional)
            <textarea
              maxLength={2000}
              value={data.additionalNotes}
              onChange={(e) => update('additionalNotes', e.target.value)}
              placeholder="Any access instructions, specific times to call, or questions?"
              disabled={isSubmitting}
            />
            <small className="field-note">{data.additionalNotes.length.toLocaleString()}/2,000 characters</small>
          </label>

          <div className="enquiry-actions full">
            <button
              type="button"
              className="enquiry-back"
              onClick={() => goTo(2)}
              disabled={isSubmitting}
            >
              ← &nbsp; Back
            </button>
            <button
              type="submit"
              className="enquiry-submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="enquiry-spinner" aria-hidden="true" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Request my quote</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>}
      <p className="enquiry-emergency">This form is not monitored for emergencies.</p>
    </div>
  )
}
