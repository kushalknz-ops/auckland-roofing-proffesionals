import { SERVICES, isCommercialService } from '../data/services'
import type { Service } from '../data/services'
import type { SEOProps } from '../hooks/useSEO'
import { socialCardPath } from './social-metadata.ts'

export const pageSEO = {
  '/': {
    title: 'Auckland Roof Professionals | Roofing & Re-Roofing',
    description: 'Get a free roofing quote from Auckland Roof Professionals. Explore metal roofing, membranes, warm roofs and asphalt shingles for homes and commercial buildings.',
    canonical: '/',
    keywords: 'roofing Auckland, roofers Auckland, commercial roofing, residential roofing, Colorsteel roofing, asphalt shingles Auckland, membrane roofing, warm roofs NZ',
  },
  '/commercial': {
    title: 'Commercial Roofing & Cladding in Auckland | ARP Roofers',
    description: 'Plan commercial roofing and cladding in Auckland. Compare standing seam metal, TPO membranes and warm roofs, and ask about roof safety and ongoing maintenance.',
    canonical: '/commercial',
    ogImage: socialCardPath('commercial'),
    ogImageAlt: 'Auckland Roof Professionals: Commercial roofing and cladding',
    keywords: 'commercial roofing Auckland, commercial re-roofing, metal cladding, membrane roofing Auckland, warm roofs NZ, roof safety systems, roof asset maintenance',
  },
  '/residential': {
    title: 'Residential Roofing & Re-Roofing in Auckland | ARP',
    description: 'Find the right roof for your Auckland home. Compare Colorsteel metal roofing, asphalt shingles, waterproof membranes and insulated warm roofs. Request a quote.',
    canonical: '/residential',
    ogImage: socialCardPath('residential'),
    ogImageAlt: 'Auckland Roof Professionals: Residential roofing and re-roofing',
    keywords: 'residential roofing Auckland, asphalt shingles Auckland, Colorsteel roofing, residential re-roofing Auckland, roof leak repair, membrane flat roofs, warm roof retrofit',
  },
  '/contact': {
    title: 'Free Roofing Quotes | Contact Auckland Roof Professionals',
    description: 'Request a free roofing quote or on-site assessment in Auckland. Call 0800 766 311 or contact our Wairau Valley team for residential and commercial roofing.',
    canonical: '/contact',
    ogImage: socialCardPath('contact'),
    ogImageAlt: 'Request a free roof quote from Auckland Roof Professionals',
    keywords: 'contact Auckland roofers, roofing quotes Auckland, emergency roof repair Auckland, Wairau Valley roofer, commercial roof inspection, residential roof quote',
  },
  '/privacy-policy': {
    title: 'Website Privacy Policy | Auckland Roof Professionals',
    description: 'Read how Auckland Roof Professionals collects, uses and protects information from roofing enquiries and website visits, and how to request access or correction.',
    canonical: '/privacy-policy',
  },
  '/terms-and-conditions': {
    title: 'Terms & Conditions | Auckland Roof Professionals Ltd',
    description: 'Read the website terms for Auckland Roof Professionals, including acceptable use and how online roofing enquiries relate to quotes and project agreements.',
    canonical: '/terms-and-conditions',
  },
  '/404': {
    title: '404 - Page Not Found | Auckland Roof Professionals',
    description: 'The page you requested could not be found. Browse commercial and residential roofing services from Auckland Roof Professionals or contact our team for help.',
    canonical: '/404',
    noIndex: true,
  },
} satisfies Record<string, SEOProps>

export const socialPreviewSEO = {
  title: 'Social Sharing Preview Tool | Auckland Roof Professionals',
  description: 'Preview how Auckland Roof Professionals pages appear when shared on Facebook, LinkedIn, X and WhatsApp, with Open Graph tags and links to platform validators.',
} satisfies SEOProps

export function findService(id: string | null) {
  return id ? SERVICES.find((service) => service.id.toLowerCase() === id.toLowerCase()) : SERVICES[0]
}

export function getServiceSEO(service?: Service): SEOProps {
  if (!service) {
    return {
      title: 'Roofing Service Not Found | Auckland Roof Professionals',
      description: 'We could not find the roofing service you requested. Browse Auckland Roof Professionals’ commercial and residential roofing options or ask our team for help.',
      canonical: '/service-not-found',
      noIndex: true,
    }
  }

  return {
    title: service.seoTitle,
    description: service.seoDescription,
    canonical: `/service/${service.id}`,
    lastModified: service.lastModified,
    ogImage: socialCardPath(`service-${service.id}`),
    ogImageAlt: `Auckland Roof Professionals: ${isCommercialService(service) ? 'Commercial' : 'Residential'} roofing service, ${service.title}`,
    keywords: `${service.title}, Auckland roofing, ${service.chips.join(', ')}`,
  }
}
