import { Component, type ReactNode, type ErrorInfo } from 'react'

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((props: { error: Error; resetError: () => void }) => ReactNode)
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    // Log error in console for debugging
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
  }

  public resetError = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null })
  }

  public override render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.resetError,
        })
      }

      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default Branded Error Fallback
      return (
        <section
          role="alert"
          aria-live="assertive"
          className="min-h-[50vh] flex items-center justify-center py-16 px-4 bg-[#F8FAF7]"
        >
          <div className="max-w-xl w-full bg-[#FFFFFF] rounded-2xl border border-[#D1DDD6] p-8 md:p-10 text-center shadow-lg">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E4EBE7] text-[#2C3533]">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E4EBE7] text-[#576562] text-xs font-semibold mb-4 tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#8FA597]" />
              System Notice
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-[#2C3533] tracking-tight mb-3">
              Something unexpected happened
            </h2>

            <p className="text-[#576562] text-sm md:text-base leading-relaxed mb-6">
              An unexpected issue interrupted this section. Don't worry — your connection to Auckland Roof Professionals is secure and you can easily reload or return to our homepage.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={this.resetError}
                className="px-6 py-2.5 rounded-lg bg-[#2C3533] text-[#F8FAF7] font-semibold text-sm hover:bg-[#3D4946] transition-colors focus:outline-none focus:ring-2 focus:ring-[#A5B8AC]"
              >
                Try Again
              </button>
              <a
                href="/"
                className="px-6 py-2.5 rounded-lg border border-[#D1DDD6] bg-transparent text-[#2C3533] font-semibold text-sm hover:bg-[#E4EBE7] transition-colors focus:outline-none focus:ring-2 focus:ring-[#A5B8AC]"
              >
                Return Home
              </a>
              <a
                href="tel:0800555766"
                className="px-6 py-2.5 rounded-lg bg-[#A5B8AC] text-[#1F2624] font-semibold text-sm hover:bg-[#8FA597] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2C3533]"
              >
                Call 0800 555 766
              </a>
            </div>

            {this.state.error.message && (
              <details className="mt-4 text-left border-t border-[#E4EBE7] pt-4 text-xs text-[#73827F]">
                <summary className="cursor-pointer hover:text-[#2C3533] select-none font-medium">
                  Technical details
                </summary>
                <pre className="mt-2 p-3 bg-[#F8FAF7] rounded border border-[#E4EBE7] overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-[#2C3533]">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </section>
      )
    }

    return this.props.children
  }
}
