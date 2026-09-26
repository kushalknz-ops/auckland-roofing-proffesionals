import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuote } from './quote-context'
import { SERVICE_OPTION_GROUPS, OTHER_OPTION, optionValueForService } from '../../data/service-options'

export function QuoteModal() {
  const { open, serviceTitle, closeQuote } = useQuote()
  const [sent, setSent] = useState(false)
  const [service, setService] = useState('')
  const [errors, setErrors] = useState<{ name?: boolean; email?: boolean }>({})
  const nameRef = useRef<HTMLInputElement>(null)

  /* pre-select service + focus when opened */
  useEffect(() => {
    if (open) {
      setSent(false)
      setErrors({})
      setService(serviceTitle ? optionValueForService(serviceTitle) : '')
      const t = setTimeout(() => nameRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open, serviceTitle])

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = e.currentTarget
    const name = (f.elements.namedItem('name') as HTMLInputElement).value.trim()
    const email = (f.elements.namedItem('email') as HTMLInputElement).value
    const errs = {
      name: !name,
      email: !/^\S+@\S+\.\S+$/.test(email),
    }
    setErrors(errs)
    if (errs.name || errs.email) return
    setSent(true)
  }

  return (
    <div
      className={`modal${open ? ' open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qmTitle"
      onClick={(e) => { if (e.target === e.currentTarget) closeQuote() }}
    >
      <div className="modal-card">
        <button className="close-modal" type="button" aria-label="Close" onClick={closeQuote}>×</button>
        <p className="eyebrow eyebrow-dark" style={sent ? { display: 'none' } : undefined}>Free quote</p>
        <h2 id="qmTitle">Request your<br />free quote.</h2>
        {sent ? (
          <p className="form-success" style={{ display: 'block' }}>
            Thanks — we'll be in touch within one business day.
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <label>
              Name
              <input type="text" name="name" required placeholder="Your name" ref={nameRef}
                style={errors.name ? { borderColor: '#c0392b' } : undefined} />
            </label>
            <label>
              Phone
              <input type="tel" name="phone" placeholder="021 000 000" />
            </label>
            <label className="full">
              Email
              <input type="email" name="email" required placeholder="you@example.co.nz"
                style={errors.email ? { borderColor: '#c0392b' } : undefined} />
            </label>
            <label className="full">
              Service
              <select name="service" value={service} onChange={(e) => setService(e.target.value)}>
                <option value="">Select a service…</option>
                {SERVICE_OPTION_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </optgroup>
                ))}
                <option value={OTHER_OPTION}>{OTHER_OPTION}</option>
              </select>
            </label>
            <label className="full">
              Project details
              <textarea name="details" rows={3} placeholder="Briefly describe your project…" />
            </label>
            <button className="submit-btn full" type="submit">Request my quote →</button>
          </form>
        )}
      </div>
    </div>
  )
}
