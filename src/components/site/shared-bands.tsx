import { useQuote } from './quote-context'

/** Copper CTA band shared across pages. */
export function CtaBand({ heading, text }: { heading: string; text: string }) {
  const { openQuote } = useQuote()
  return (
    <section className="cta-band">
      <div className="reveal">
        <h2>{heading}</h2>
        <p>{text}</p>
      </div>
      <button className="cta-band-btn reveal" type="button" onClick={() => openQuote()}>
        Get a free quote <span>→</span>
      </button>
    </section>
  )
}

/** Illustrated service-area map band (home + service pages). */
export function MapBand() {
  return (
    <section className="section map-band">
      <div className="map-grid" aria-hidden="true">
        <div className="map-pin">
          <svg viewBox="0 0 24 24"><path d="M12 22s7-6.1 7-12a7 7 0 10-14 0c0 5.9 7 12 7 12z" /><circle cx="12" cy="10" r="2.6" /></svg>
          <span className="map-pin-pulse" />
        </div>
      </div>
      <div className="map-copy reveal">
        <p className="eyebrow">Service area</p>
        <h2>All of Auckland.<br />One team.</h2>
        <p>From the North Shore to Manukau, West Auckland to Howick — our crews cover the entire Tāmaki Makaurau region.</p>
        <a className="outline-btn" href="https://www.google.com/maps/search/Penrose,+Auckland" target="_blank" rel="noopener">
          Open in Google Maps <span>↗</span>
        </a>
      </div>
    </section>
  )
}
