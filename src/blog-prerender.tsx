import { StrictMode } from 'react'
import { renderToReadableStream } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { AppLayout } from './App'

export { articles } from './data/blog'
export { getBlogSEO } from './lib/blog-seo'
export { PROJECTS } from './data/projects'
export { getProjectSEO } from './lib/project-seo'
export { SERVICES } from './data/services'
export { getServiceSEO, pageSEO, socialPreviewSEO } from './lib/page-seo'
export { normalizeCanonicalUrl } from './hooks/useSEO'
export { getSocialTags } from './lib/social-metadata'

export async function renderBlog(url: string) {
  const stream = await renderToReadableStream(
    <StrictMode>
      <StaticRouter location={url}>
        <AppLayout />
      </StaticRouter>
    </StrictMode>,
    { onError(error) { throw error } },
  )
  await stream.allReady
  return new Response(stream).text()
}
