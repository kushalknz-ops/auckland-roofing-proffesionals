import { useEffect, Suspense, lazy } from 'react'
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { QuoteProvider } from './components/site/quote-context'
import { Header } from './components/site/Header'
import { Footer } from './components/site/Footer'
import { QuoteModal } from './components/site/QuoteModal'
import { GlassFilter } from './components/ui/liquid-glass'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { LoadingState } from './components/ui/LoadingState'
import { useReveal } from './hooks/useReveal'
import HomePage from './pages/HomePage'
import CategoryPage from './pages/CategoryPage'
import ServicePage from './pages/ServicePage'
import ContactPage from './pages/ContactPage'
import NotFoundPage from './pages/NotFoundPage'
import type { pageSEO } from './lib/page-seo'

const BlogPage = lazy(() => import('./pages/BlogPage'))
const LegalPage = lazy(() => import('./pages/LegalPage'))
const ProjectPage = lazy(() => import('./pages/ProjectPage'))
const BlogArticlePage = lazy(() => import('./pages/BlogPage').then((module) => ({ default: module.BlogArticlePage })))

const staticPages = {
  '/': <HomePage />,
  '/commercial': <CategoryPage kind="commercial" />,
  '/residential': <CategoryPage kind="residential" />,
  '/contact': <ContactPage />,
  '/privacy-policy': <LegalPage page="privacy" />,
  '/terms-and-conditions': <LegalPage page="terms" />,
  '/404': <NotFoundPage />,
} satisfies Record<keyof typeof pageSEO, React.ReactElement>

/**
 * Scroll manager — emulates native anchor navigation for routed links:
 * hash targets scroll smoothly to the element, everything else goes to top.
 */
function ScrollManager() {
  const { pathname, hash, search } = useLocation()
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    if (hash) {
      const targetId = hash.slice(1)
      let rafId: number
      let attempts = 0
      const maxAttempts = 25

      const tryScroll = () => {
        const el = document.getElementById(targetId)
        if (el) {
          el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
        } else if (attempts < maxAttempts) {
          attempts++
          rafId = requestAnimationFrame(tryScroll)
        } else {
          document.documentElement.style.scrollBehavior = 'auto'
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
          document.documentElement.scrollTop = 0
          document.body.scrollTop = 0
          document.documentElement.style.scrollBehavior = ''
        }
      }

      rafId = requestAnimationFrame(tryScroll)
      return () => cancelAnimationFrame(rafId)
    }

    const t = requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = 'auto'
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      document.documentElement.style.scrollBehavior = ''
    })
    return () => cancelAnimationFrame(t)
  }, [pathname, hash, search])
  return null
}

/** Reveal-on-scroll manager, re-armed on every route change. */
function RevealManager() {
  const { pathname, search } = useLocation()
  useReveal([pathname, search])
  return null
}

export function AppLayout() {
  return (
    <QuoteProvider>
      {/* WCAG 2.2 Level AA Skip Link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {/* SVG filter used by the liquid-glass header (url(#glass-distortion)) */}
      <GlassFilter />
      <ScrollManager />
      <RevealManager />
      <Header />

      <ErrorBoundary>
        <Suspense fallback={<LoadingState fullPage message="Loading page..." />}>
          <Routes>
            {Object.entries(staticPages).map(([path, element]) => <Route key={path} path={path} element={element} />)}
            <Route path="/service" element={<ServicePage />} />
            <Route path="/service-default" element={<ServicePage />} />
            <Route path="/service/:id" element={<ServicePage />} />
            <Route path="/projects/:slug" element={<ProjectPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogArticlePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Footer />
      <QuoteModal />
    </QuoteProvider>
  )
}

export default function App() {
  return <BrowserRouter><AppLayout /></BrowserRouter>
}
