import { useQuote } from './quote-context'
import { RoofingEnquiryForm } from './RoofingEnquiryForm'
import { ErrorBoundary } from '../ui/ErrorBoundary'

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
        {open && (
          <ErrorBoundary
            fallback={
              <div className="p-8 text-center" role="alert">
                <h3 className="text-xl font-bold text-[#2C3533] mb-2">Something went wrong</h3>
                <p className="text-sm text-[#576562] mb-4">We were unable to load the quote enquiry form right now.</p>
                <a
                  href="tel:0800555766"
                  className="inline-block px-5 py-2 rounded-lg bg-[#2C3533] text-[#F8FAF7] text-sm font-semibold"
                >
                  Call 0800 555 766
                </a>
              </div>
            }
          >
            <RoofingEnquiryForm initialService={serviceTitle} />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}
