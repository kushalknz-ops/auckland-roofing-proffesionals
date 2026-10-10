import type { HTMLAttributes } from 'react'

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  fullPage?: boolean
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size]

  return (
    <div
      className={`inline-block animate-spin rounded-full border-solid border-[#A5B8AC] border-t-transparent ${sizeClasses}`}
      role="progressbar"
      aria-label="Loading content"
      aria-valuemin={0}
      aria-valuemax={100}
    />
  )
}

export function LoadingState({
  message = 'Loading content...',
  size = 'md',
  fullPage = false,
  className = '',
  ...props
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center justify-center text-center p-8 ${
        fullPage ? 'min-h-[60vh] py-24' : 'py-12'
      } ${className}`}
      {...props}
    >
      <div className="relative flex items-center justify-center mb-4">
        <LoadingSpinner size={size} />
      </div>
      <p className="text-[#3A4542] text-sm md:text-base font-medium tracking-wide">
        {message}
      </p>
      <span className="sr-only">{message}</span>
    </div>
  )
}
