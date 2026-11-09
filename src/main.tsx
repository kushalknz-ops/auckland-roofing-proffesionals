import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.tsx'
import { installBrowserMonitoring, reactMonitoring } from './lib/monitoring'
import './index.css'
import './arp.css'
import './enquiry.css'

installBrowserMonitoring()
const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

if (root.dataset.prerenderPath === window.location.pathname.replace(/\/+$/, '')) {
  hydrateRoot(root, app, reactMonitoring)
} else {
  createRoot(root, reactMonitoring).render(app)
}
