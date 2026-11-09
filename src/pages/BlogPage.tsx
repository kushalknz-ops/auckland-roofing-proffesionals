import { useState } from 'react'
import { ArrowDown, ArrowRight, ChevronDown, Search } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { articles, blogCategories, getArticle, type BlogArticle } from '../data/blog'
import { SERVICES, isCommercialService } from '../data/services'
import { useSEO } from '../hooks/useSEO'
import { getBlogSEO } from '../lib/blog-seo'
import NotFoundPage from './NotFoundPage'
import '../blog.css'

const featured = articles.filter((article) => article.featured)
const nonFeatured = articles.filter((article) => !article.featured)
const commercialServices = SERVICES.filter(isCommercialService)
const dateFormat = new Intl.DateTimeFormat('en-NZ', { dateStyle: 'long', timeZone: 'UTC' })
const pageSize = 6

function Breadcrumbs({ article }: { article?: BlogArticle }) {
  return (
    <nav className="blog-crumbs" aria-label="Breadcrumb">
      <ol>
        <li><Link to="/">Home</Link></li>
        <li>{article ? <Link to="/blog">Blog</Link> : <span aria-current="page">Blog</span>}</li>
        {article && <li><span aria-current="page">{article.title}</span></li>}
      </ol>
    </nav>
  )
}

function ArticleImage({ article, priority, hero }: { article: BlogArticle; priority?: boolean; hero?: boolean }) {
  const { src, small, alt, width, height } = article.image
  return (
    <img
      src={src}
      srcSet={`${small} 600w, ${src} 1200w`}
      sizes={hero
        ? '(max-width: 768px) calc(100vw - 32px), min(calc(100vw - 48px), 1152px)'
        : priority
          ? '(max-width: 680px) calc(100vw - 32px), (max-width: 1200px) 55vw, 640px'
          : '(max-width: 520px) calc(100vw - 32px), (max-width: 900px) 48vw, 368px'}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
    />
  )
}

function ArticleMeta({ article }: { article: BlogArticle }) {
  return (
    <div className="blog-meta">
      <time dateTime={article.published}>{dateFormat.format(new Date(article.published))}</time>
      <span>{article.readingTime} min read</span>
    </div>
  )
}

function ArticleCard({ article, lead = false }: { article: BlogArticle; lead?: boolean }) {
  return (
    <article className={`blog-card${lead ? ' blog-card--lead' : ''}`}>
      <div className="blog-card-image">
        <ArticleImage article={article} priority={lead} />
      </div>
      <div className="blog-card-copy">
        <p className="blog-category">{article.category}</p>
        <h3><Link to={`/blog/${article.slug}`}>{article.title}</Link></h3>
        <p className="blog-card-description">{article.description}</p>
        <ArticleMeta article={article} />
        <span className="blog-card-arrow" aria-hidden="true"><ArrowRight size={19} /></span>
      </div>
    </article>
  )
}

export default function BlogPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const terms = query.toLocaleLowerCase('en-NZ').trim().split(/\s+/).filter(Boolean)
  const filtered = Boolean(category || terms.length)
  const results = filtered
    ? articles.filter((article) => {
      if (category && article.category !== category) return false
      const content = [
        article.title, article.description, article.category, article.answer,
        ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.points ?? [])]),
        ...article.faq.flatMap((entry) => [entry.question, entry.answer]),
      ].join(' ').toLocaleLowerCase('en-NZ')
      return terms.every((term) => content.includes(term))
    })
    : nonFeatured
  const lead = featured[0]
  const more = results.slice(pageSize)

  useSEO(getBlogSEO())

  return (
    <main id="main-content" tabIndex={-1} className="blog">
      <header className="blog-masthead">
        <div className="container">
          <Breadcrumbs />
          <h1>Commercial Roofing Blog</h1>
          <p>Practical guides for Auckland property owners and facility managers planning inspections, maintenance and roof replacement.</p>
          <a className="blog-masthead-link" href="#blog-articles">Browse articles <ArrowDown size={16} aria-hidden="true" /></a>
        </div>
      </header>

      {lead && (
        <section className="container blog-feature" aria-labelledby="blog-feature-title">
          <h2 id="blog-feature-title">Featured {featured.length === 1 ? 'article' : 'articles'}</h2>
          <ArticleCard article={lead} lead />
          {featured.length > 1 && (
            <div className="blog-card-grid blog-feature-more">
              {featured.slice(1).map((article) => <ArticleCard key={article.slug} article={article} />)}
            </div>
          )}
        </section>
      )}

      <section className="blog-library" id="blog-articles" aria-labelledby="blog-library-title">
        <div className="container">
          <h2 id="blog-library-title">{filtered ? 'Search results' : 'Latest articles'}</h2>
          <div className="blog-controls">
            <div className="blog-search" role="search" aria-label="Roofing articles">
              <label htmlFor="blog-search">Search articles</label>
              <div>
                <Search size={18} aria-hidden="true" />
                <input
                  id="blog-search"
                  type="search"
                  value={query}
                  placeholder="Try roof leaks or maintenance"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
            <fieldset className="blog-filters">
              <legend>Filter by category</legend>
              <div>
                {['', ...blogCategories].map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="blog-category"
                      value={value}
                      checked={category === value}
                      onChange={() => setCategory(value)}
                    />
                    <span>{value || 'All topics'}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <p className="blog-result-count" role="status">
            {results.length} {results.length === 1 ? 'article' : 'articles'}{filtered && ' found'}
          </p>
          {results.length ? (
            <>
              <div className="blog-card-grid">
                {results.slice(0, pageSize).map((article) => <ArticleCard key={article.slug} article={article} />)}
              </div>
              {more.length > 0 && (
                <details className="blog-more" key={`${category}:${query}`}>
                  <summary className="blog-button">
                    <span className="blog-more-show">Show {more.length} more articles</span>
                    <span className="blog-more-hide">Hide additional articles</span>
                    <ChevronDown size={16} aria-hidden="true" />
                  </summary>
                  <div className="blog-card-grid">
                    {more.map((article) => <ArticleCard key={article.slug} article={article} />)}
                  </div>
                </details>
              )}
            </>
          ) : (
            <div className="blog-empty">
              <h3>{filtered ? 'No articles match your search' : 'New guides are on the way'}</h3>
              <p>{filtered ? 'Try a broader search or choose another category.' : 'In the meantime, explore our commercial roofing services.'}</p>
              {filtered
                ? <button type="button" className="blog-button" onClick={() => { setQuery(''); setCategory('') }}>Clear search and filters</button>
                : <Link className="blog-button" to="/commercial">Explore commercial roofing</Link>}
            </div>
          )}
        </div>
      </section>

      <section className="container blog-services" aria-labelledby="blog-services-title">
        <h2 id="blog-services-title">Explore commercial roofing services</h2>
        <p>Use our guides to plan your next step, then explore the service that suits your building.</p>
        <ul>
          {commercialServices.map((service) => (
            <li key={service.id}>
              <Link to={`/service/${service.id}`}>
                {service.title}<ArrowRight size={17} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <Link className="text-link-dark" to="/commercial">View all commercial roofing services <ArrowRight size={17} aria-hidden="true" /></Link>
      </section>
    </main>
  )
}

function InlineLinks({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\((?:https:\/\/|\/(?!\/))[^\s)]+\))/g)
  return parts.map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (!link) return part
    const [, label, url] = link
    return url.startsWith('/')
      ? <Link key={index} to={url}>{label}</Link>
      : <a key={index} href={url}>{label}</a>
  })
}

function Article({ article }: { article: BlogArticle }) {
  const services = article.services.flatMap((id) => SERVICES.find((service) => service.id === id) ?? [])
  const related = article.related.flatMap((slug) => getArticle(slug) ?? [])
  useSEO(getBlogSEO(article))

  return (
    <main id="main-content" tabIndex={-1} className="blog">
      <article aria-labelledby="blog-article-title">
        <header className="blog-masthead blog-masthead--article">
          <div className="container">
            <Breadcrumbs article={article} />
            <h1 id="blog-article-title">{article.title}</h1>
            <p className="blog-answer"><InlineLinks text={article.answer} /></p>
            <div className="blog-byline">
              <span>By {article.author}</span>
              <ArticleMeta article={article} />
            </div>
          </div>
        </header>

        <div className="container blog-article-image">
          <ArticleImage article={article} priority hero />
        </div>

        <div className="container blog-article-layout">
          <aside className="blog-article-side">
            <nav aria-label="In this article" className="blog-toc">
              <h2>In this article</h2>
              <ul>
                {article.sections.map((section, index) => (
                  <li key={section.heading}><a href={`#topic-${index + 1}`}>{section.heading}</a></li>
                ))}
                <li><a href="#key-takeaways">Key takeaways</a></li>
                <li><a href="#article-faq">Frequently asked questions</a></li>
              </ul>
            </nav>
          </aside>

          <div className="blog-prose">
            {article.sections.map((section, index) => {
              const List = section.ordered ? 'ol' : 'ul'
              return (
                <section key={section.heading} id={`topic-${index + 1}`}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}><InlineLinks text={paragraph} /></p>)}
                  {section.points?.length ? (
                    <List>
                      {section.points.map((point) => <li key={point}><InlineLinks text={point} /></li>)}
                    </List>
                  ) : null}
                </section>
              )
            })}

            <section className="blog-takeaways" id="key-takeaways">
              <h2>Key takeaways</h2>
              <ul>
                {article.takeaways.map((point) => <li key={point}><InlineLinks text={point} /></li>)}
              </ul>
            </section>

            <section id="article-faq" className="blog-faq">
              <h2>Frequently asked questions</h2>
              {article.faq.map(({ question, answer }) => (
                <details key={question}>
                  <summary>
                    <h3>{question}</h3>
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <p><InlineLinks text={answer} /></p>
                </details>
              ))}
            </section>

            {services.length > 0 && (
              <section className="blog-service-links">
                <h2>Related roofing services</h2>
                <ul>
                  {services.map((service) => (
                    <li key={service.id}><Link to={`/service/${service.id}`}>{service.title}<ArrowRight size={17} aria-hidden="true" /></Link></li>
                  ))}
                </ul>
                <Link to="/commercial">View all commercial roofing services</Link>
              </section>
            )}
          </div>
        </div>

        <section className="cta-band">
          <div className="container cta-band-inner">
            <div>
              <h2>{article.cta.title}</h2>
              <p>{article.cta.text}</p>
            </div>
            <Link className="cta-band-btn" to="/contact">{article.cta.label} <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </section>
      </article>

      {related.length > 0 && (
        <section className="container blog-related">
          <div className="blog-related-heading">
            <h2>Related articles</h2>
            <Link to="/blog">View all articles <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <div className="blog-card-grid">
            {related.map((item) => <ArticleCard key={item.slug} article={item} />)}
          </div>
        </section>
      )}
    </main>
  )
}

export function BlogArticlePage() {
  const { slug } = useParams()
  const article = slug && getArticle(slug)
  return article ? <Article key={article.slug} article={article} /> : <NotFoundPage />
}
