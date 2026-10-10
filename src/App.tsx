import { useEffect, Suspense } from 'react'
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
          el.scrollIntoView({ behavior: 'smooth' })
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

export default function App() {
  return (
    <BrowserRouter>
      <QuoteProvider>
        {/* SVG filter used by the liquid-glass header (url(#glass-distortion)) */}
        <GlassFilter />
        <ScrollManager />
        <RevealManager />
        <Header />
        <ErrorBoundary>
          <Suspense fallback={<LoadingState fullPage message="Loading page..." />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/commercial" element={<CategoryPage kind="commercial" />} />
              <Route path="/residential" element={<CategoryPage kind="residential" />} />
              <Route path="/service" element={<ServicePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
        <Footer />
        <QuoteModal />
      </QuoteProvider>
    </BrowserRouter>
  )
}
