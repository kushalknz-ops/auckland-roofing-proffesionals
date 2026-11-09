import { useQuote } from './quote-context'

/** Copper CTA band shared across pages. */
export function CtaBand({ heading, text }: { heading: string; text: string }) {
  const { openQuote } = useQuote()
  return (
    <section className="cta-band">
      <div className="container cta-band-inner">
        <div className="reveal">
          <h2>{heading}</h2>
          <p>{text}</p>
        </div>
        <button className="cta-band-btn reveal" type="button" onClick={(event) => openQuote(event.currentTarget)}>
          Get a free quote <span>→</span>
        </button>
      </div>
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
          src="https://www.google.com/maps?q=59%2F7+Porana+Road%2C+Wairau+Valley%2C+Auckland+0627%2C+New+Zealand&t=&z=14&ie=UTF8&iwloc=&output=embed"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          aria-label="Google Maps showing workshop at 59/7 Porana Road, Wairau Valley, Auckland 0627, New Zealand"
        />
      </div>
      <div className="map-copy reveal">
        <p className="eyebrow">Service area</p>
        <h2>All of Auckland.<br />One team.</h2>
        <p>From the North Shore to Manukau, West Auckland to Howick — our crews cover the entire Tāmaki Makaurau region.</p>
        <a
          className="outline-btn"
          href="https://www.google.com/maps/search/?api=1&query=59%2F7+Porana+Road%2C+Wairau+Valley%2C+Auckland+0627%2C+New+Zealand"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps <span>↗</span>
        </a>
      </div>
    </section>
  )
}
