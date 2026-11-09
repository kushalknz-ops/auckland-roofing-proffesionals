import { CANONICAL_ORIGIN } from './site-url.ts'

export const DEFAULT_SITE_NAME = 'Auckland Roof Professionals'
export const DEFAULT_LOCALE = 'en_NZ'
export const SOCIAL_WIDTH = 1200
export const SOCIAL_HEIGHT = 630

export const DEFAULT_ORIGIN = import.meta.env?.VITE_SITE_URL || CANONICAL_ORIGIN
// Keep local HTTP preview settings out of the image URLs sent to crawlers.
const imageOrigin = DEFAULT_ORIGIN.startsWith('https://') ? DEFAULT_ORIGIN : CANONICAL_ORIGIN

export function socialCardPath(name: string) {
  return `/assets/social/${name}-v2.jpg`
}

export const DEFAULT_OG_IMAGE = new URL(socialCardPath('roofing'), imageOrigin).href
export const DEFAULT_OG_ALT = 'Auckland Roof Professionals: Commercial and residential roofing'

interface SocialMetadata {
  title: string
  description: string
  ogImage?: string
  ogImageAlt?: string
  ogType?: 'website' | 'article'
}

export function getSocialTags(meta: SocialMetadata, url: string) {
  const image = meta.ogImage ? new URL(meta.ogImage, imageOrigin).href : DEFAULT_OG_IMAGE
  const alt = meta.ogImageAlt || DEFAULT_OG_ALT

  return {
    'og:type': meta.ogType ?? 'website',
    'og:site_name': DEFAULT_SITE_NAME,
    'og:locale': DEFAULT_LOCALE,
    'og:title': meta.title,
    'og:description': meta.description,
    'og:url': url,
    'og:image': image,
    'og:image:secure_url': image,
    'og:image:type': 'image/jpeg',
    'og:image:width': String(SOCIAL_WIDTH),
    'og:image:height': String(SOCIAL_HEIGHT),
    'og:image:alt': alt,
    'twitter:card': 'summary_large_image',
    'twitter:title': meta.title,
    'twitter:description': meta.description,
    'twitter:image': image,
    'twitter:image:alt': alt,
  }
}
