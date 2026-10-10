import { useEffect } from 'react'

export interface SEOProps {
  title: string
  description: string
  canonical?: string
  ogImage?: string
  ogType?: 'website' | 'article'
  keywords?: string
  noIndex?: boolean
}

export const DEFAULT_ORIGIN = (
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL
    ? import.meta.env.VITE_SITE_URL
    : 'https://aucklandroofprofessionals.nz'
).replace(/\/+$/, '')

const DEFAULT_OG_IMAGE = `${DEFAULT_ORIGIN}/assets/img/trust.jpg`

function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attrName, attrValue)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * Normalizes an input path or full URL into an authoritative canonical URL:
 * - Uses DEFAULT_ORIGIN as the base
 * - Retains trailing slash on root ('https://aucklandroofprofessionals.nz/')
 * - Strips trailing slash on subpaths ('/commercial/' -> '/commercial')
 * - Strips URL fragments/hashes
 * - Ensures single forward slashes
 */
export function normalizeCanonicalUrl(url?: string): string {
  if (!url) {
    if (typeof window === 'undefined') return `${DEFAULT_ORIGIN}/`
    const path = window.location.pathname.replace(/\/+$/, '') || '/'
    return `${DEFAULT_ORIGIN}${path}`
  }

  // If already absolute URL
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url)
      const normalizedPath = parsed.pathname.length > 1
        ? parsed.pathname.replace(/\/+$/, '')
        : '/'
      parsed.pathname = normalizedPath
      parsed.hash = ''
      return parsed.toString()
    } catch {
      return url
    }
  }

  // Relative path or query string
  const clean = url.trim()
  const leadingSlash = clean.startsWith('/') ? clean : `/${clean}`
  try {
    const parsed = new URL(leadingSlash, DEFAULT_ORIGIN)
    const normalizedPath = parsed.pathname.length > 1
      ? parsed.pathname.replace(/\/+$/, '')
      : '/'
    parsed.pathname = normalizedPath
    parsed.hash = ''
    return parsed.toString()
  } catch {
    const withoutHash = leadingSlash.split('#')[0]
    return `${DEFAULT_ORIGIN}${withoutHash}`
  }
}

function setCanonicalLink(url: string) {
  const existingLinks = document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]')
  if (existingLinks.length > 0) {
    existingLinks[0].setAttribute('href', url)
    for (let i = 1; i < existingLinks.length; i++) {
      existingLinks[i].remove()
    }
  } else {
    const link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    link.setAttribute('href', url)
    document.head.appendChild(link)
  }
}

export function useSEO({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  keywords,
  noIndex = false,
}: SEOProps) {
  useEffect(() => {
    // 1. Page Title
    document.title = title

    // 2. Primary Meta Tags
    setMetaTag('name', 'description', description)
    if (keywords) {
      setMetaTag('name', 'keywords', keywords)
    }
    if (noIndex) {
      setMetaTag('name', 'robots', 'noindex, nofollow')
    } else {
      setMetaTag('name', 'robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1')
    }

    // 3. Canonical Tag
    const resolvedCanonical = normalizeCanonicalUrl(canonical)
    setCanonicalLink(resolvedCanonical)

    // 4. Open Graph Meta Tags
    const resolvedOgImage = ogImage.startsWith('http')
      ? ogImage
      : `${DEFAULT_ORIGIN}${ogImage}`

    setMetaTag('property', 'og:title', title)
    setMetaTag('property', 'og:description', description)
    setMetaTag('property', 'og:url', resolvedCanonical)
    setMetaTag('property', 'og:type', ogType)
    setMetaTag('property', 'og:image', resolvedOgImage)

    // 5. Twitter Card Meta Tags
    setMetaTag('name', 'twitter:title', title)
    setMetaTag('name', 'twitter:description', description)
    setMetaTag('name', 'twitter:image', resolvedOgImage)
  }, [title, description, canonical, ogImage, ogType, keywords, noIndex])
}
