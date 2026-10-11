import { useEffect, useRef } from 'react'
import { useQuote } from './quote-context'
import { RoofingEnquiryForm } from './RoofingEnquiryForm'
import { ErrorBoundary } from '../ui/ErrorBoundary'

export function QuoteModal() {
  const { open, serviceTitle, closeQuote } = useQuote()
  const modalRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'

      // Focus the close button or first focusable element inside the modal
      const timer = setTimeout(() => {
        if (closeBtnRef.current) {
          closeBtnRef.current.focus()
        }
      }, 50)

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          closeQuote()
          return
        }

        if (e.key === 'Tab' && modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
          if (focusableElements.length === 0) return

          const firstElement = focusableElements[0]
          const lastElement = focusableElements[focusableElements.length - 1]

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault()
              lastElement.focus()
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault()
              firstElement.focus()
            }
          }
        }
      }

      document.addEventListener('keydown', handleKeyDown)

      return () => {
        clearTimeout(timer)
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
        if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
          previousActiveElementRef.current.focus()
        }
      }
    }
  }, [open, closeQuote])

  return (
    <div
      ref={modalRef}
      className={`modal enquiry-modal${open ? ' open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Roofing enquiry"
      aria-hidden={!open}
      inert={!open ? true : undefined}
      onClick={(event) => { if (event.target === event.currentTarget) closeQuote() }}
    >
      <div className="modal-card enquiry-modal-card">
        <button
          ref={closeBtnRef}
          className="close-modal"
          type="button"
          aria-label="Close enquiry form"
          onClick={closeQuote}
        >
          ×
        </button>
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
