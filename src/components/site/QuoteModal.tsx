import { useQuote } from './quote-context'
import { RoofingEnquiryForm } from './RoofingEnquiryForm'

export function QuoteModal() {
  const { open, serviceTitle, closeQuote } = useQuote()

  return (
    <div
      className={`modal enquiry-modal${open ? ' open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Roofing enquiry"
      onClick={(event) => { if (event.target === event.currentTarget) closeQuote() }}
    >
      <div className="modal-card enquiry-modal-card">
        <button className="close-modal" type="button" aria-label="Close enquiry form" onClick={closeQuote}>×</button>
        {open && <RoofingEnquiryForm initialService={serviceTitle} />}
      </div>
    </div>
  )
}
