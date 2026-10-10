import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
}

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  className?: string
  children?: ReactNode
}

function DefaultEmptyIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#73827F"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  className = '',
  children,
}: EmptyStateProps) {
  const renderAction = (act: EmptyStateAction, isPrimary = true) => {
    const baseClass = isPrimary
      ? 'inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#2C3533] text-[#F8FAF7] font-semibold text-sm transition-colors hover:bg-[#3D4946] focus:outline-none focus:ring-2 focus:ring-[#A5B8AC]'
      : 'inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-[#D1DDD6] bg-transparent text-[#2C3533] font-semibold text-sm transition-colors hover:bg-[#E4EBE7] focus:outline-none focus:ring-2 focus:ring-[#A5B8AC]'

    if (act.href) {
      if (act.href.startsWith('http') || act.href.startsWith('tel:') || act.href.startsWith('mailto:')) {
        return (
          <a
            key={act.label}
            href={act.href}
            className={baseClass}
            onClick={act.onClick}
          >
            {act.label}
          </a>
        )
      }
      return (
        <Link
          key={act.label}
          to={act.href}
          className={baseClass}
          onClick={act.onClick}
        >
          {act.label}
        </Link>
      )
    }

    return (
      <button
        key={act.label}
        type="button"
        onClick={act.onClick}
        className={baseClass}
      >
        {act.label}
      </button>
    )
  }

  return (
    <div
      role="status"
      className={`rounded-2xl border border-[#D1DDD6] bg-[#FFFFFF] p-8 md:p-12 text-center my-6 shadow-sm max-w-2xl mx-auto ${className}`}
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E4EBE7]">
        {icon || <DefaultEmptyIcon />}
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-[#2C3533] tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm md:text-base text-[#576562] max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}

      {children && <div className="mt-6">{children}</div>}

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action && renderAction(action, true)}
          {secondaryAction && renderAction(secondaryAction, false)}
        </div>
      )}
    </div>
  )
}
