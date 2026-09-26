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
      <div className="map-frame-wrap">
        <iframe
          className="map-iframe"
          title="Auckland Roof Professionals Workshop Location"
          src="https://maps.google.com/maps?q=59+Porana+Road,+Glenfield,+Auckland+0627,+New+Zealand&t=&z=14&ie=UTF8&iwloc=&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          aria-label="Google Maps showing workshop at 59 Porana Road, Glenfield, Auckland"
        />
      </div>
      <div className="map-copy reveal">
        <p className="eyebrow">Service area</p>
        <h2>All of Auckland.<br />One team.</h2>
        <p>From the North Shore to Manukau, West Auckland to Howick — our crews cover the entire Tāmaki Makaurau region.</p>
        <a
          className="outline-btn"
          href="https://maps.app.goo.gl/CKoTxUWEz61N48q18"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps <span>↗</span>
        </a>
      </div>
    </section>
  )
}
