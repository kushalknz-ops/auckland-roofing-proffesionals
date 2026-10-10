import { useEffect } from 'react'

export interface SEOProps {
  title: string
  description: string
  canonical?: string
  ogImage?: string
  ogType?: 'website' | 'article'
  keywords?: string
}

const DEFAULT_ORIGIN = 'https://aucklandroofprofessionals.nz'
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

function setCanonicalLink(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

export function useSEO({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  keywords,
}: SEOProps) {
  useEffect(() => {
    // 1. Page Title
    document.title = title

    // 2. Primary Meta Tags
    setMetaTag('name', 'description', description)
    if (keywords) {
      setMetaTag('name', 'keywords', keywords)
    }

    // 3. Canonical Tag
    const resolvedCanonical = canonical
      ? canonical.startsWith('http')
        ? canonical
        : `${DEFAULT_ORIGIN}${canonical}`
      : `${DEFAULT_ORIGIN}${window.location.pathname}`
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
  }, [title, description, canonical, ogImage, ogType, keywords])
}
