const PARTNERS = [
  {
    name: 'Roof Expert',
    logo: '/assets/img/powered-by-roof-expert.webp',
    width: 941,
    height: 307,
  },
  {
    name: 'Auckland Industrial Roofing',
    logo: '/assets/img/powered-by-auckland-industrial-roofing.png',
    width: 852,
    height: 394,
  },
  {
    name: 'Auckland Reliable Roofing',
    logo: '/assets/img/powered-by-auckland-reliable-roofing.webp',
    width: 173,
    height: 107,
  },
] as const

export function PoweredBy({ className = '' }: { className?: string }) {
  return (
    <div className={`powered-by ${className}`.trim()}>
      <h3 className="powered-by-title">Powered by</h3>
      <ul className="powered-by-list">
        {PARTNERS.map((partner) => (
          <li className="powered-by-partner" key={partner.name}>
            <div className="powered-by-logo-wrap">
              <img
                className="powered-by-logo"
                src={partner.logo}
                alt={`${partner.name} logo`}
                width={partner.width}
                height={partner.height}
                loading="lazy"
                decoding="async"
              />
            </div>
            <span className="powered-by-name">{partner.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
