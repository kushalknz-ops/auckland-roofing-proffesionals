import { useEffect } from 'react'
import { CANONICAL_ORIGIN, normalizePagePath } from '../lib/site-url.ts'
import { getSocialTags } from '../lib/social-metadata.ts'

export interface SEOProps {
  title: string
  description: string
  canonical?: string
  lastModified?: string
  ogImage?: string
  ogImageAlt?: string
  ogType?: 'website' | 'article'
  keywords?: string
  noIndex?: boolean
  structuredData?: string
}

function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
  const [existing, ...duplicates] = document.head.querySelectorAll<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`)
  duplicates.forEach((tag) => tag.remove())
  let el = existing
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attrName, attrValue)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function normalizeCanonicalUrl(url: string): string {
  const { pathname } = new URL(url, CANONICAL_ORIGIN)
  return `${CANONICAL_ORIGIN}${normalizePagePath(pathname)}`
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
  ogImage,
  ogImageAlt,
  ogType,
  keywords,
  noIndex = false,
  structuredData,
}: SEOProps) {
  useEffect(() => {
    // 1. Page Title
    document.title = title

    // 2. Primary Meta Tags
    setMetaTag('name', 'description', description)
    if (keywords) {
      setMetaTag('name', 'keywords', keywords)
    } else {
      document.querySelector('meta[name="keywords"]')?.remove()
    }
    if (noIndex) {
      setMetaTag('name', 'robots', 'noindex, nofollow')
    } else {
      setMetaTag('name', 'robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1')
    }

    // 3. Canonical Tag
    const resolvedCanonical = normalizeCanonicalUrl(canonical ?? window.location.pathname)
    if (noIndex) {
      document.querySelectorAll('link[rel="canonical"]').forEach((link) => link.remove())
    } else {
      setCanonicalLink(resolvedCanonical)
    }

    const socialTags = getSocialTags({ title, description, ogImage, ogImageAlt, ogType }, resolvedCanonical)
    for (const [name, content] of Object.entries(socialTags)) {
      setMetaTag(name.startsWith('og:') ? 'property' : 'name', name, content)
    }

    const previousData = document.getElementById('page-structured-data')
    if (structuredData) {
      const script = previousData || document.createElement('script')
      script.id = 'page-structured-data'
      script.setAttribute('type', 'application/ld+json')
      script.textContent = structuredData
      if (!previousData) document.head.appendChild(script)
    } else {
      previousData?.remove()
    }
  }, [
    title,
    description,
    canonical,
    ogImage,
    ogImageAlt,
    ogType,
    keywords,
    noIndex,
    structuredData,
  ])
}
