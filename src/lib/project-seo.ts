import { projectPath, type Project } from '../data/projects'
import { normalizeCanonicalUrl, type SEOProps } from '../hooks/useSEO'
import { CANONICAL_ORIGIN } from './site-url.ts'
import { DEFAULT_SITE_NAME, socialCardPath } from './social-metadata.ts'

export function getProjectSEO(project: Project): SEOProps {
  const canonical = projectPath(project)
  const url = normalizeCanonicalUrl(canonical)
  const breadcrumbs = [
    { name: 'Home', item: `${CANONICAL_ORIGIN}/` },
    { name: 'Projects', item: `${CANONICAL_ORIGIN}/#projects` },
    { name: project.title, item: url },
  ]
  return {
    title: project.seoTitle,
    description: project.seoDescription,
    canonical,
    lastModified: project.lastModified,
    ogType: 'article',
    ogImage: project.imageKind === 'portfolio' ? socialCardPath(`project-${project.slug}`) : undefined,
    ogImageAlt: project.imageKind === 'portfolio' ? project.alt : undefined,
    structuredData: JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [{
        '@type': 'WebPage', '@id': `${url}#page`, url,
        name: project.title, description: project.desc, inLanguage: 'en-NZ',
        isPartOf: { '@type': 'WebSite', url: `${CANONICAL_ORIGIN}/`, name: DEFAULT_SITE_NAME },
        breadcrumb: { '@id': `${url}#breadcrumbs` },
      }, {
        '@type': 'BreadcrumbList', '@id': `${url}#breadcrumbs`,
        itemListElement: breadcrumbs.map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })),
      }],
    }).replace(/</g, '\\u003c'),
  }
}
