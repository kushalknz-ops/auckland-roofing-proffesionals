import React, { useState, useEffect, useRef, useCallback } from 'react'
import type {
  GoogleReview,
  GoogleBusinessProfile,
} from '../../data/google-reviews'
import {
  AUTHENTIC_GOOGLE_REVIEWS,
  GOOGLE_BUSINESS_PROFILE,
} from '../../data/google-reviews'

export interface GoogleReviewsCarouselProps {
  reviews?: GoogleReview[]
  profile?: GoogleBusinessProfile
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  eyebrow?: string
  title?: string
  subtitle?: string
}

// Google 4-Color G Icon SVG
function GoogleGIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      className="gr-google-g"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.28 21.39 7.35 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.4l4.03-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.28 2.61 1.25 6.6l4.03 3.13c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  )
}

// Star SVG
function StarIcon({ filled = true }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill={filled ? '#FBBC04' : '#D1DDD6'}
      aria-hidden="true"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

export function GoogleReviewsCarousel({
  reviews = AUTHENTIC_GOOGLE_REVIEWS,
  profile = GOOGLE_BUSINESS_PROFILE,
  isLoading = false,
  error = null,
  onRetry,
  eyebrow = 'Trusted partners — Google Reviews',
  title = 'What Auckland Property Owners Say',
  subtitle = 'Authentic 5-star Google reviews from homeowners and commercial clients across Auckland.',
}: GoogleReviewsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(4)
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({})

  // Touch swipe support
  const touchStartX = useRef<number | null>(null)
  const touchCurrentX = useRef<number | null>(null)

  // Track viewport width for responsive card counts (Desktop: 4, Tablet: 2, Mobile: 1)
  useEffect(() => {
    function updateVisibleCount() {
      const w = window.innerWidth
      let count = 4
      if (w < 640) {
        count = 1
      } else if (w < 1024) {
        count = 2
      }
      setVisibleCount(count)
      const max = Math.max(0, reviews.length - count)
      setCurrentIndex((prev) => Math.min(prev, max))
    }

    updateVisibleCount()
    window.addEventListener('resize', updateVisibleCount)
    return () => window.removeEventListener('resize', updateVisibleCount)
  }, [reviews.length])

  const maxIndex = Math.max(0, reviews.length - visibleCount)

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : maxIndex))
  }, [maxIndex])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0))
  }, [maxIndex])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      }
    },
    [handlePrev, handleNext]
  )

  // Touch event handlers for mobile/tablet swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchCurrentX.current === null) return
    const diff = touchStartX.current - touchCurrentX.current
    const threshold = 40

    if (diff > threshold) {
      handleNext()
    } else if (diff < -threshold) {
      handlePrev()
    }

    touchStartX.current = null
    touchCurrentX.current = null
  }

  const toggleExpand = (id: string) => {
    setExpandedReviews((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <section
      className="section google-reviews-section"
      id="testimonials"
      aria-label="Customer Reviews"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="container">
        {/* Header Block */}
        <div className="gr-header">
          <div className="gr-header-left">
            <p className="eyebrow reveal visible">{eyebrow}</p>
            <h2 className="reveal visible">{title}</h2>
            {subtitle && <p className="gr-subtitle reveal visible">{subtitle}</p>}
          </div>

          {/* Google Summary Badge */}
          <div className="gr-header-right">
            <a
              href={profile.reviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gr-overall-badge"
              title="View authentic Auckland Reliable Roofing Google reviews"
            >
              <div className="gr-badge-icon">
                <GoogleGIcon />
              </div>
              <div className="gr-badge-info">
                <div className="gr-badge-top">
                  <span className="gr-badge-score">{profile.rating.toFixed(1)}</span>
                  <div className="gr-badge-stars" aria-label={`Rated ${profile.rating} out of 5 stars`}>
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} />
                    ))}
                  </div>
                </div>
                <span className="gr-badge-count">
                  Based on {profile.totalReviews}+ Google reviews ↗
                </span>
              </div>
            </a>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="gr-loading-grid" role="status" aria-busy="true" aria-label="Loading customer reviews">
            <span className="sr-only">Loading verified Google reviews...</span>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="gr-card-skeleton" aria-hidden="true">
                <div className="gr-skel-header">
                  <div className="gr-skel-avatar" />
                  <div className="gr-skel-meta">
                    <div className="gr-skel-line w-3-4" />
                    <div className="gr-skel-line w-1-2" />
                  </div>
                </div>
                <div className="gr-skel-line w-1-3" />
                <div className="gr-skel-line w-full" />
                <div className="gr-skel-line w-full" />
                <div className="gr-skel-line w-2-3" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="gr-error-box" role="alert" aria-live="assertive">
            <div className="gr-error-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C54E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '8px 0', color: 'var(--headline)' }}>
              Unable to Load Customer Reviews
            </h3>
            <p className="gr-error-text" style={{ maxWidth: '480px', margin: '0 auto 16px' }}>
              {error}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {onRetry && (
                <button type="button" className="outline-btn" onClick={onRetry}>
                  Try again
                </button>
              )}
              <a
                href={profile.reviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="outline-btn"
              >
                Read reviews on Google ↗
              </a>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && reviews.length === 0 && (
          <div className="gr-empty-box" role="status">
            <div className="gr-empty-icon" aria-hidden="true" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <GoogleGIcon />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: 'var(--headline)' }}>
              No Reviews Currently Displayed
            </h3>
            <p style={{ color: 'var(--muted-l)', maxWidth: '460px', margin: '0 auto 16px', fontSize: '14px' }}>
              We're currently updating our customer testimonials. You can view all authentic feedback directly on our verified Google profile.
            </p>
            <a
              href={profile.reviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="outline-btn"
            >
              View Google Business Reviews ↗
            </a>
          </div>
        )}

        {/* Carousel Slider */}
        {!isLoading && !error && reviews.length > 0 && (
          <div
            className="gr-slider-container"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="gr-slider-viewport">
              <div
                className="gr-slider-track"
                style={{
                  transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`,
                }}
              >
                {reviews.map((rev) => {
                  const isLong = rev.text.length > 150
                  const isExpanded = !!expandedReviews[rev.id]
                  const displayText = isLong && !isExpanded
                    ? `${rev.text.slice(0, 145).trim()}…`
                    : rev.text

                  return (
                    <div
                      key={rev.id}
                      className="gr-card-col"
                      style={{
                        width: `${100 / visibleCount}%`,
                      }}
                    >
                      <article className="gr-card">
                        <div className="gr-card-head">
                          <div className="gr-author-meta">
                            {rev.authorPhoto ? (
                              <img
                                src={rev.authorPhoto}
                                alt={rev.authorName}
                                className="gr-avatar-img"
                              />
                            ) : (
                              <div className="gr-avatar-fallback">
                                {rev.authorInitials}
                              </div>
                            )}
                            <div>
                              <strong className="gr-author-name">{rev.authorName}</strong>
                              <span className="gr-date-label">
                                {rev.relativeTime || rev.date}
                              </span>
                            </div>
                          </div>
                          <div className="gr-source-indicator" title="Verified Google Review">
                            <GoogleGIcon />
                          </div>
                        </div>

                        {/* Stars */}
                        <div
                          className="gr-stars-row"
                          aria-label={`Rated ${rev.rating} out of 5 stars`}
                        >
                          {[...Array(5)].map((_, i) => (
                            <StarIcon key={i} filled={i < rev.rating} />
                          ))}
                          <span className="gr-stars-text">{rev.rating}.0</span>
                        </div>

                        {/* Text */}
                        <p className="gr-review-text">
                          &ldquo;{displayText}&rdquo;
                          {isLong && (
                            <button
                              type="button"
                              className="gr-read-more"
                              onClick={() => toggleExpand(rev.id)}
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? ' Read less' : ' Read more'}
                            </button>
                          )}
                        </p>

                        {/* Card Footer */}
                        <div className="gr-card-footer">
                          <span className="gr-verified-tag">
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                              <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                            </svg>
                            Verified Customer
                          </span>
                          <a
                            href={profile.reviewsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gr-source-link"
                          >
                            Google Review ↗
                          </a>
                        </div>
                      </article>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Slider Controls matching native design */}
            <div className="gr-controls-bar">
              <button
                type="button"
                className="gr-control-btn"
                aria-label="Previous reviews"
                onClick={handlePrev}
              >
                ←
              </button>

              <div className="gr-dots-indicator" role="tablist" aria-label="Review page indicators">
                {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    className={`gr-dash-dot ${i === currentIndex ? 'active' : ''}`}
                    aria-label={`Go to review group ${i + 1}`}
                    aria-selected={i === currentIndex}
                    onClick={() => setCurrentIndex(i)}
                  />
                ))}
              </div>

              <button
                type="button"
                className="gr-control-btn"
                aria-label="Next reviews"
                onClick={handleNext}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
