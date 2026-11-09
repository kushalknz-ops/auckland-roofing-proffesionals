import operations from '../content/blog-operations.json'
import planning from '../content/blog-planning.json'

export const blogCategories = ['Maintenance', 'Roof Systems', 'Project Planning'] as const

interface BlogSection {
  heading: string
  paragraphs: string[]
  points?: string[]
  ordered?: boolean
}

const images = {
  maintenance: ['commercial-roof-maintenance', 'Worker inspecting the gutter beside a profiled metal roof'],
  metal: ['profiled-metal-commercial-roof', 'Profiled metal roofing on a commercial building'],
  membrane: ['commercial-membrane-roof', 'Low-slope commercial roof with membrane waterproofing'],
  warehouse: ['industrial-warehouse-roof', 'Roof of a large industrial warehouse'],
  albany: ['albany-commercial-roof', 'Low-rise commercial building with a pitched metal roof'],
} as const

interface ArticleContent {
  slug: string
  title: string
  description: string
  seoTitle: string
  seoDescription: string
  category: string
  answer: string
  sections: BlogSection[]
  takeaways: string[]
  faq: { question: string; answer: string }[]
  image: string
  services: string[]
  related: string[]
  cta: { title: string; text: string; label: string }
  published?: string
  lastModified?: string
}

export interface BlogArticle extends Omit<ArticleContent, 'image' | 'published'> {
  published: string
  author: string
  featured: boolean
  readingTime: number
  image: { src: string; small: string; social: string; alt: string; width: number; height: number }
}

const launchDate = '2026-11-04'
const featuredSlug = 'commercial-roof-maintenance'

export const articles: BlogArticle[] = ([...operations, ...planning] satisfies ArticleContent[])
  .map((article: ArticleContent) => {
    const [name, alt] = images[article.image as keyof typeof images]
    const base = `/assets/blog/${name}`
    const words = [
      article.title, article.answer,
      ...article.sections.flatMap(section => [section.heading, ...section.paragraphs, ...(section.points ?? [])]),
      ...article.takeaways,
      ...article.faq.flatMap(item => [item.question, item.answer]),
    ].join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim().split(/\s+/).length

    return {
      ...article,
      published: article.published ?? launchDate,
      author: 'Auckland Roof Professionals',
      featured: article.slug === featuredSlug,
      readingTime: Math.ceil(words / 220),
      image: {
        src: `${base}.webp`,
        small: `${base}-600.webp`,
        social: `${base}.jpg`,
        alt,
        width: 1200,
        height: 750,
      },
    }
  })
  .sort((a, b) => b.published.localeCompare(a.published))

export function getArticle(slug?: string) {
  return articles.find(article => article.slug === slug)
}
