import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { OTHER_OPTION, SERVICE_OPTION_GROUPS, optionValueForService } from '../../data/service-options'

type Step = 1 | 2 | 3
type Errors = Partial<Record<'service' | 'location' | 'details' | 'name' | 'email' | 'phone', string>>

interface FormData {
  property: string
  service: string
  location: string
  timeframe: string
  details: string
  name: string
  email: string
  phone: string
  contactMethod: string
  files: File[]
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
  const [errors, setErrors] = useState<Errors>({})
  const [data, setData] = useState<FormData>({
    property: 'home', service: initialService ? optionValueForService(initialService) : '', location: '',
    timeframe: 'Not sure yet', details: '', name: '', email: '', phone: '', contactMethod: 'Email', files: [],
  })
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialService) setData((d) => ({ ...d, service: optionValueForService(initialService) }))
  }, [initialService])

  const update = (key: keyof FormData, value: string | File[]) => {
    setData((d) => ({ ...d, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }
  const goTo = (next: Step) => {
    setStep(next)
    requestAnimationFrame(() => panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
  }
  const validateProject = () => {
    const next: Errors = {}
    if (!data.service) next.service = 'Choose the work you need help with.'
    if (!data.location.trim()) next.location = 'Enter the property suburb or location.'
    if (data.details.trim().length < 10) next.details = 'Add a short description of the work (at least 10 characters).'
    setErrors(next)
    return !Object.keys(next).length
  }
  const validateContact = () => {
    const next: Errors = {}
    if (!data.name.trim()) next.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(data.email)) next.email = 'Enter a valid email address.'
    if (!data.phone.trim()) next.phone = 'Enter your phone number.'
    setErrors(next)
    return !Object.keys(next).length
  }
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, 3).filter((file) => file.size <= 4 * 1024 * 1024)
    update('files', files)
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!validateContact()) return
    setSent(true)
    onSuccess?.()
  }

  if (sent) return (
    <div className="enquiry-success" role="status">
      <span>✓</span><p className="eyebrow eyebrow-dark">Enquiry received</p>
      <h2>Thanks, {data.name}.</h2>
      <p>Our roofing team will be in touch within one business day.</p>
    </div>
  )

  return (
    <div className="enquiry-form" ref={panelRef}>
      <ol className="enquiry-steps" aria-label={`Step ${step} of 3`}>
        {['Property', 'Project', 'Contact'].map((label, index) => {
          const number = (index + 1) as Step
          return <li key={label} className={number === step ? 'active' : number < step ? 'complete' : ''}>
            <span>{number < step ? '✓' : number}</span><small>{label}</small>
          </li>
        })}
      </ol>

      {step === 1 && <section className="enquiry-step" aria-labelledby="property-title">
        <header><h2 id="property-title">What kind of property is it?</h2><p>Choose the option that best describes your project.</p></header>
        <div className="property-options">
          {PROPERTY_OPTIONS.map((option) => <label key={option.value} className={data.property === option.value ? 'selected' : ''}>
            <input type="radio" name="property" value={option.value} checked={data.property === option.value} onChange={() => update('property', option.value)} />
            <span className="option-radio" aria-hidden="true" />
            <span className="property-icon"><PropertyIcon type={option.icon} /></span>
            <span className="property-copy"><strong>{option.title}</strong><small>{option.description}</small></span>
          </label>)}
        </div>
        <div className="enquiry-info"><strong>What happens after you enquire?</strong><p>Your details provide a starting point to discuss scope and any assessment needed. A quote or inspection is agreed separately.</p></div>
        <div className="enquiry-actions right"><button type="button" className="enquiry-primary" onClick={() => goTo(2)}>Continue <span>→</span></button></div>
      </section>}

      {step === 2 && <section className="enquiry-step" aria-labelledby="project-title">
        <header><h2 id="project-title">Tell us about the roofing work.</h2><p>A few details help establish the next step. Fields marked * are required.</p></header>
        <div className="enquiry-fields">
          <label className="full">What do you need help with? *
            <select value={data.service} onChange={(e) => update('service', e.target.value)} aria-invalid={!!errors.service}>
              <option value="">Select a roofing service</option>
              {SERVICE_OPTION_GROUPS.map((g) => <optgroup key={g.label} label={g.label}>{g.options.map((o) => <option key={o}>{o}</option>)}</optgroup>)}
              <option>{OTHER_OPTION}</option>
            </select>{errors.service && <em>{errors.service}</em>}
          </label>
          <label>Property suburb / location *
            <input value={data.location} onChange={(e) => update('location', e.target.value)} placeholder="e.g. Mount Eden, Auckland" aria-invalid={!!errors.location} />
            {errors.location && <em>{errors.location}</em>}
          </label>
          <label>Your timeframe *
            <select value={data.timeframe} onChange={(e) => update('timeframe', e.target.value)}><option>Not sure yet</option><option>As soon as possible</option><option>Within 1–3 months</option><option>Within 3–6 months</option><option>Planning ahead</option></select>
          </label>
          <label className="full">A little about the work *
            <textarea maxLength={2000} value={data.details} onChange={(e) => update('details', e.target.value)} placeholder="What have you noticed, or what are you planning?" aria-invalid={!!errors.details} />
            {errors.details && <em>{errors.details}</em>}<small className="field-note">{data.details.length.toLocaleString()}/2,000 characters. Include roof type or approximate size if known.</small>
          </label>
          <label className="full upload-label"><span className="upload-title">↥ &nbsp; Add photos (optional)</span>
            <span className="upload-box"><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={onFiles} /><strong>{data.files.length ? `${data.files.length} photo${data.files.length > 1 ? 's' : ''} selected` : 'Choose files or drop photos here'}</strong><small>Up to 3 JPG, PNG or WebP photos. Maximum 4 MB each. Only take photos from a safe location.</small></span>
          </label>
        </div>
        <div className="enquiry-actions"><button type="button" className="enquiry-back" onClick={() => goTo(1)}>← &nbsp; Back</button><button type="button" className="enquiry-primary" onClick={() => { if (validateProject()) goTo(3) }}>Continue <span>→</span></button></div>
      </section>}

      {step === 3 && <section className="enquiry-step" aria-labelledby="contact-title">
        <header><h2 id="contact-title">Tell us about yourself.</h2><p>Where should our roofing team send your quote and next steps?</p></header>
        <form className="enquiry-fields" onSubmit={submit} noValidate>
          <label>Name *<input autoComplete="name" value={data.name} onChange={(e) => update('name', e.target.value)} placeholder="Your name" aria-invalid={!!errors.name} />{errors.name && <em>{errors.name}</em>}</label>
          <label>Email *<input type="email" autoComplete="email" value={data.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.co.nz" aria-invalid={!!errors.email} />{errors.email && <em>{errors.email}</em>}</label>
          <label>Phone *<input type="tel" autoComplete="tel" value={data.phone} onChange={(e) => update('phone', e.target.value)} placeholder="021 000 000" aria-invalid={!!errors.phone} />{errors.phone && <em>{errors.phone}</em>}</label>
          <label>Preferred contact method<select value={data.contactMethod} onChange={(e) => update('contactMethod', e.target.value)}><option>Email</option><option>Phone</option><option>Text message</option></select></label>
          <label className="full">Project details / additional information<textarea maxLength={2000} value={data.details} onChange={(e) => update('details', e.target.value)} placeholder="Anything else our team should know?" /><small className="field-note">{data.details.length.toLocaleString()}/2,000 characters</small></label>
          <div className="enquiry-actions full"><button type="button" className="enquiry-back" onClick={() => goTo(2)}>← &nbsp; Back</button><button type="submit" className="enquiry-submit">Request my quote <span>→</span></button></div>
        </form>
      </section>}
      <p className="enquiry-emergency">This form is not monitored for emergencies.</p>
    </div>
  )
}
