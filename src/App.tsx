import { useEffect } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { QuoteProvider } from './components/site/quote-context'
import { Header } from './components/site/Header'
import { Footer } from './components/site/Footer'
import { QuoteModal } from './components/site/QuoteModal'
import { GlassFilter } from './components/ui/liquid-glass'
import { useReveal } from './hooks/useReveal'
import HomePage from './pages/HomePage'
import CategoryPage from './pages/CategoryPage'
import ServicePage from './pages/ServicePage'
import ContactPage from './pages/ContactPage'

/**
 * Scroll manager — emulates native anchor navigation for routed links:
 * hash targets scroll smoothly to the element, everything else goes to top.
 */
function ScrollManager() {
  const { pathname, hash, search } = useLocation()
  useEffect(() => {
    if (hash) {
      // wait a frame so the target is painted before scrolling
      const t = requestAnimationFrame(() => {
        const el = document.getElementById(hash.slice(1))
        if (el) el.scrollIntoView({ behavior: 'smooth' })
        else window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      })
      return () => cancelAnimationFrame(t)
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/commercial" element={<CategoryPage kind="commercial" />} />
          <Route path="/residential" element={<CategoryPage kind="residential" />} />
          <Route path="/service" element={<ServicePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
        <QuoteModal />
      </QuoteProvider>
    </BrowserRouter>
  )
}
