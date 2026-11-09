import type { BlogArticle } from '../data/blog'
import { normalizeCanonicalUrl } from '../hooks/useSEO'
import type { SEOProps } from '../hooks/useSEO'
import { CANONICAL_ORIGIN } from './site-url.ts'
import { DEFAULT_ORIGIN, socialCardPath } from './social-metadata.ts'

const BLOG_TITLE = 'Commercial Roofing Blog'
const BLOG_DESCRIPTION = 'Practical guides for Auckland property owners and facility managers planning inspections, maintenance and roof replacement.'
const BLOG_URL = normalizeCanonicalUrl('/blog')
const BUSINESS_ID = `${CANONICAL_ORIGIN}/#roofingcontractor`

export function getBlogSEO(article?: BlogArticle): SEOProps {
  const canonical = article ? `/blog/${article.slug}` : '/blog'
  const url = normalizeCanonicalUrl(canonical)
  const title = article?.title ?? BLOG_TITLE
  const breadcrumbItems = [
    { name: 'Home', item: `${CANONICAL_ORIGIN}/` },
    { name: 'Blog', item: BLOG_URL },
  ]
  if (article) breadcrumbItems.push({ name: article.title, item: url })

  const breadcrumbs = {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumbs`,
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      ...item,
    })),
  }

  const blog = {
    '@type': 'Blog',
    '@id': `${BLOG_URL}#blog`,
    url: BLOG_URL,
    name: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    inLanguage: 'en-NZ',
    publisher: { '@id': BUSINESS_ID },
  }

  const page = article ? {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    url,
    mainEntityOfPage: url,
    headline: title,
    description: article.answer.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'),
    articleSection: article.category,
    inLanguage: 'en-NZ',
    datePublished: article.published,
    image: new URL(article.image.src, DEFAULT_ORIGIN).href,
    author: {
      '@type': 'Organization',
      '@id': BUSINESS_ID,
      name: article.author,
      url: `${CANONICAL_ORIGIN}/`,
    },
    publisher: { '@id': BUSINESS_ID },
    isPartOf: { '@id': blog['@id'] },
  } : blog

  return {
    title: article?.seoTitle ?? 'Auckland Commercial Roofing Blog & Guides | ARP Roofers',
    description: article?.seoDescription ?? 'Explore commercial roofing guides for Auckland property owners and facility managers. Plan roof inspections, maintenance, repairs and replacement with ARP.',
    canonical,
    lastModified: article?.lastModified ?? article?.published,
    ogType: article ? 'article' : 'website',
    ogImage: article?.image.social ?? socialCardPath('blog'),
    ogImageAlt: article?.image.alt ?? 'Auckland Roof Professionals: Commercial roofing guides',
    structuredData: JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': article ? [page, blog, breadcrumbs] : [page, breadcrumbs],
    }).replace(/</g, '\\u003c'),
  }
}
