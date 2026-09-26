import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { CtaBand, MapBand } from '../components/site/shared-bands'
import { useQuote } from '../components/site/quote-context'
import { RoofingEnquiryForm } from '../components/site/RoofingEnquiryForm'

/* ============================================================
   STATS BAND — count-up on first view (port of index.js)
   ============================================================ */
const STATS = [
  { count: 15, suffix: '+', label: "Years' experience" },
  { count: 600, suffix: '+', label: 'Projects completed' },
  { count: 100, suffix: '%', label: 'Licensed & insured' },
  { count: 10, suffix: '-yr', label: 'Workmanship warranty' },
] as const

function StatsBand() {
  const [values, setValues] = useState<number[]>(STATS.map(() => 0))
  const wrapRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        io.disconnect()
        const dur = 1600
        const t0 = performance.now()
        const tick = (t: number) => {
          const p = Math.min((t - t0) / dur, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          setValues(STATS.map((s) => Math.round(s.count * eased)))
          if (p < 1) rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <section className="stats-band">
      <div className="stats" ref={wrapRef}>
        {STATS.map((s, i) => (
          <div className="reveal" key={s.label}>
            <strong data-count={s.count} data-suffix={s.suffix}>
              {values[i]}
              <em>{s.suffix}</em>
            </strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ============================================================
   PROCESS — scroll-driven circle timeline with inertial ease
   (port of index.js processTimeline)
   ============================================================ */
const STEPS = [
  {
    n: '01', title: 'Consultation',
    text: 'We understand your needs, assess your property and provide honest, expert advice.',
  },
  {
    n: '02', title: 'Planning',
    text: 'We develop a tailored solution, outlining scope, materials, programme and price.',
  },
  {
    n: '03', title: 'Installation',
    text: 'Our experienced team delivers high-quality workmanship with minimal disruption.',
  },
  {
    n: '04', title: 'Ongoing support',
    text: "We're here for the long term, with maintenance programmes and continued support.",
  },
]

function ProcessSection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const track = trackRef.current
    const stepsWrap = stepsRef.current
    const fill = fillRef.current
    if (!track || !stepsWrap || !fill) return
    /* CSS shows a static readable version when motion is reduced */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cards = Array.from(stepsWrap.querySelectorAll('.process-step')) as HTMLElement[]
    const LAST = cards.length - 1
    const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)

    let target = 0
    let current = -1
    let running = false
    let lastT = 0
    let raf = 0
    const TAU = 0.14 // seconds — lower = snappier, higher = floatier

    const render = (v: number) => {
      const active = clamp(Math.round(v), 0, LAST)
      cards.forEach((el, i) => el.classList.toggle('is-active', i === active))
      // rail runs circle-centre → circle-centre, so fill completes at the last step
      fill.style.setProperty('--pf', `${(v / LAST) * 100}%`)
    }

    const tick = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.05)
      lastT = now
      current += (target - current) * (1 - Math.exp(-dt / TAU))
      render(current)
      if (Math.abs(target - current) > 0.0008) {
        raf = requestAnimationFrame(tick)
      } else {
        current = target // settle exactly to avoid sub-pixel drift
        render(current)
        running = false
      }
    }

    const computeStepFloat = () => {
      if (window.innerWidth > 900) {
        // Desktop: pinned — scroll through the tall track maps 0→LAST
        const r = track.getBoundingClientRect()
        const total = Math.max(r.height - window.innerHeight, 1)
        return clamp(-r.top / total, 0, 1) * LAST
      }
      // Mobile: in-flow vertical timeline — viewport centre maps across card centres
      const c = window.innerHeight * 0.55
      const centers = cards.map((a) => {
        const r = a.getBoundingClientRect()
        return r.top + r.height / 2
      })
      if (c <= centers[0]) return 0
      if (c >= centers[LAST]) return LAST
      for (let i = 0; i < LAST; i++) {
        if (c >= centers[i] && c <= centers[i + 1]) {
          return i + (c - centers[i]) / Math.max(centers[i + 1] - centers[i], 1)
        }
      }
      return 0
    }

    const wake = () => {
      target = clamp(computeStepFloat(), 0, LAST)
      if (current < 0) { current = target; render(current) } // snap on first paint
      if (!running) { running = true; lastT = performance.now(); raf = requestAnimationFrame(tick) }
    }
    const onResize = () => { current = -1; wake() }

    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('resize', onResize)
    wake()

    return () => {
      window.removeEventListener('scroll', wake)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="section process" id="process">
      <div className="process-track" ref={trackRef}>
        <div className="process-pin">
          <div className="process-inner">
            <p className="eyebrow reveal">Our process</p>
            <div className="section-heading reveal">
              <h2>A clear process.<br />A stronger outcome.</h2>
              <p>Scroll to walk through each step — from initial consultation to project completion.</p>
            </div>
            <div className="process-steps" ref={stepsRef}>
              <div className="process-progress" aria-hidden="true">
                <span className="process-progress-fill" ref={fillRef} />
              </div>
              {STEPS.map((s, i) => (
                <article className={`process-step${i === 0 ? ' is-active' : ''}`} key={s.n}>
                  <i className="step-dot"><em>Step</em><b>{s.n}</b></i>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   TESTIMONIALS — auto slider, 6.5s (port of index.js)
   ============================================================ */
const TESTIMONIALS = [
  {
    quote: '"Professional, reliable and easy to work with. The team delivered our commercial re-roof on time, and the quality of work was outstanding."',
    name: 'James T.', role: 'Property Manager · Auckland CBD',
  },
  {
    quote: '"Their attention to detail and communication throughout our villa re-roof made the whole process completely seamless."',
    name: 'Sarah L.', role: 'Homeowner · Remuera',
  },
  {
    quote: '"A trusted partner for all our roofing maintenance. Proactive, thorough and honest — we wouldn\'t hesitate to recommend them."',
    name: 'Michael R.', role: 'Facilities Manager · East Tāmaki',
  },
]

function TestimonialsSection() {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const auto = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(
      () => setCurrent((c) => (c + 1) % TESTIMONIALS.length),
      6500,
    )
  }, [])

  useEffect(() => {
    auto()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [auto])

  const show = (i: number) => {
    setCurrent((i + TESTIMONIALS.length) % TESTIMONIALS.length)
    auto()
  }

  return (
    <section className="section testimonials" id="testimonials">
      <p className="eyebrow reveal">Trusted partners</p>
      {TESTIMONIALS.map((t, i) => (
        <div key={t.name} className={`testimonial${i === current ? ' active' : ''}`}>
          <p>{t.quote}</p>
          <strong>{t.name}</strong>
          <span>{t.role}</span>
        </div>
      ))}
      <div className="slider-controls">
        <button type="button" aria-label="Previous testimonial" onClick={() => show(current - 1)}>←</button>
        <div className="dots">
          {TESTIMONIALS.map((_, n) => (
            <i
              key={n}
              className={n === current ? 'active' : ''}
              onClick={() => show(n)}
            />
          ))}
        </div>
        <button type="button" aria-label="Next testimonial" onClick={() => show(current + 1)}>→</button>
      </div>
    </section>
  )
}

/* ============================================================
   FAQ — accordion (port of index.js)
   ============================================================ */
const FAQS = [
  {
    q: 'Are you licensed and insured?',
    a: 'Yes. Our roofers are Licensed Building Practitioners and we carry full public liability insurance on every project, commercial or residential. Site Safe certified crews lead every installation.',
  },
  {
    q: 'How long does a re-roof take?',
    a: 'Most residential re-roofs take 1–2 weeks depending on size and system. Commercial projects are programmed individually — we stage work to keep your business operating with minimal disruption.',
  },
  {
    q: 'Do you offer free quotes?',
    a: 'Yes — every quote is free and obligation-free. We visit your site, assess the existing roof, talk through options and provide a detailed written proposal with clear, fixed pricing.',
  },
  {
    q: 'What roofing systems do you specialise in?',
    a: 'Commercially: metal roofs & cladding, membrane roofing, warm roof systems, roof safety systems and asset maintenance. Residentially: asphalt shingles (our speciality), metal roofs, membrane roofing and warm roof systems.',
  },
  {
    q: 'Do you guarantee your work?',
    a: 'Every installation is backed by our 10-year workmanship warranty alongside manufacturer product warranties — including Colorsteel® systems and leading membrane brands.',
  },
  {
    q: 'Do you handle council compliance and permits?',
    a: 'We manage the consent and compliance documentation your roof requires, including producer statements and code compliance support, so your project stays simple from start to finish.',
  },
]

function FaqSection() {
  const [open, setOpen] = useState(-1)
  const aRefs = useRef<(HTMLDivElement | null)[]>([])

  return (
    <section className="section faq" id="faq">
      <div className="faq-head reveal">
        <p className="eyebrow">Answers</p>
        <h2>Questions,<br />answered.</h2>
        <p>Still got a question? <a href="#contact" className="text-link">Talk to our team →</a></p>
      </div>
      <div className="faq-list reveal">
        {FAQS.map((f, i) => (
          <div key={f.q} className={`faq-item${open === i ? ' open' : ''}`}>
            <button
              type="button"
              className="faq-q"
              onClick={() => setOpen(open === i ? -1 : i)}
            >
              {f.q}<span className="faq-icon" />
            </button>
            <div
              className="faq-a"
              ref={(el) => { aRefs.current[i] = el }}
              style={
                open === i
                  ? { maxHeight: `${aRefs.current[i]?.scrollHeight ?? 500}px` }
                  : undefined
              }
            >
              <p>{f.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ============================================================
   INLINE QUOTE FORM (contact section)
   ============================================================ */
function InlineQuoteForm() {
  return <RoofingEnquiryForm />
}

/* ============================================================
   PROJECTS SECTION — continuous smooth auto-scrolling carousel
   with hover-pause, touch swiping, and manual nav controls
   ============================================================ */
const PROJECTS = [
  {
    num: '01',
    cat: 'Commercial',
    loc: 'Albany • Retail',
    title: 'Albany Commercial Centre',
    desc: '2,400m² standing seam metal roof and wall cladding upgrade, staged for zero downtime to trading tenants.',
    scope: 'Metal Roof + Cladding',
    duration: '6 Weeks',
    img: '/assets/img/project-albany.jpg',
    alt: 'Albany commercial centre with new standing seam metal roof',
  },
  {
    num: '02',
    cat: 'Residential',
    loc: 'Remuera • Re-roof',
    title: 'Remuera Villa Re-Roof',
    desc: 'Premium architectural asphalt shingle re-roof on a heritage-style family home, colour-matched to its original profile.',
    scope: 'Asphalt Shingles',
    duration: '2 Weeks',
    img: '/assets/img/project-remuera.jpg',
    alt: 'Remuera villa with new architectural asphalt shingle roof',
  },
  {
    num: '03',
    cat: 'Industrial',
    loc: 'East Tāmaki • Logistics',
    title: 'East Tāmaki Warehouse',
    desc: 'Engineered warm roof system with high-performance PIR insulation for a temperature-sensitive distribution centre.',
    scope: 'Warm Roof + PIR',
    duration: '4 Weeks',
    img: '/assets/img/project-warehouse.jpg',
    alt: 'East Tāmaki distribution warehouse with warm roof system',
  },
  {
    num: '04',
    cat: 'Commercial',
    loc: 'Takapuna • Healthcare',
    title: 'Takapuna Medical Centre',
    desc: 'Complete architectural standing seam roofing with enhanced acoustic insulation and custom perimeter flashings.',
    scope: 'Standing Seam Metal',
    duration: '5 Weeks',
    img: '/assets/img/svc-metal-commercial.jpg',
    alt: 'Takapuna medical facility with standing seam metal roofing',
  },
  {
    num: '05',
    cat: 'Residential',
    loc: 'Devonport • Coastal',
    title: 'Devonport Coastal Villa',
    desc: 'Marine-grade Colorsteel replacement engineered for high wind zones and salt-spray resistance with traditional profile lines.',
    scope: 'Colorsteel Maxx',
    duration: '3 Weeks',
    img: '/assets/img/svc-metal-res.jpg',
    alt: 'Devonport heritage home with marine-grade Colorsteel roof',
  },
]

function ProjectsSection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const isPausedRef = useRef(false)
  const resumeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) return

    let rafId: number
    let lastTime = performance.now()
    const speed = 40 // px per second

    const setupInitialPosition = () => {
      if (!track) return
      const singleSetWidth = track.scrollWidth / 3
      if (singleSetWidth > 0 && track.scrollLeft === 0) {
        track.scrollLeft = singleSetWidth
      }
    }

    const timer = window.setTimeout(setupInitialPosition, 60)

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000
      lastTime = now

      if (!isPausedRef.current && track) {
        const singleSetWidth = track.scrollWidth / 3
        if (singleSetWidth > 0) {
          track.scrollLeft += speed * delta

          if (track.scrollLeft >= singleSetWidth * 2) {
            track.scrollLeft -= singleSetWidth
          } else if (track.scrollLeft <= 5) {
            track.scrollLeft += singleSetWidth
          }
        }
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      window.clearTimeout(timer)
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current)
      cancelAnimationFrame(rafId)
    }
  }, [])

  const handleNav = (dir: -1 | 1) => {
    const track = trackRef.current
    if (!track) return

    isPausedRef.current = true
    const firstCard = track.children[0] as HTMLElement | undefined
    const step = firstCard ? firstCard.offsetWidth + 20 : 400

    track.scrollBy({ left: dir * step, behavior: 'smooth' })

    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = window.setTimeout(() => {
      isPausedRef.current = false
    }, 2500)
  }

  // 3 duplicate sets of 5 projects for a seamless, continuous infinite wrap
  const allProjects = [...PROJECTS, ...PROJECTS, ...PROJECTS]

  return (
    <section className="section projects" id="projects">
      <div className="projects-top">
        <div className="reveal">
          <p className="eyebrow">Our work</p>
          <h2>Real projects.<br />Lasting results.</h2>
        </div>
        <div className="projects-top-right reveal">
          <p>From industrial facilities to family homes across Tāmaki Makaurau, our work speaks for itself.</p>
          <div className="projects-nav-controls" aria-label="Project carousel controls">
            <button
              type="button"
              className="projects-nav-btn prev"
              onClick={() => handleNav(-1)}
              aria-label="Previous projects"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              className="projects-nav-btn next"
              onClick={() => handleNav(1)}
              aria-label="Next projects"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        className="projects-carousel-wrap reveal"
        onMouseEnter={() => { isPausedRef.current = true }}
        onMouseLeave={() => { isPausedRef.current = false }}
        onTouchStart={() => { isPausedRef.current = true }}
        onTouchEnd={() => {
          if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current)
          resumeTimerRef.current = window.setTimeout(() => {
            isPausedRef.current = false
          }, 2000)
        }}
      >
        <div className="projects-track" ref={trackRef}>
          {allProjects.map((p, idx) => (
            <article key={`${p.num}-${idx}`}>
              <img src={p.img} alt={p.alt} loading="lazy" />
              <div className="project-content">
                <div className="project-label">
                  <small>{p.num} · {p.cat}</small>
                  <span>{p.loc}</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
                <dl>
                  <div>
                    <dt>Scope</dt>
                    <dd>{p.scope}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{p.duration}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   HOME PAGE
   ============================================================ */
export default function HomePage() {
  const { openQuote } = useQuote()
  const heroVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (heroVideoRef.current) {
      heroVideoRef.current.defaultMuted = true
      heroVideoRef.current.muted = true
      heroVideoRef.current.play().catch(() => {})
    }
  }, [])

  return (
    <main id="top">
      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="hero-media" aria-hidden="true">
          <video
            ref={heroVideoRef}
            className="hero-video"
            poster="/assets/landing-video-poster.jpg"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          >
            <source
              src="https://res.cloudinary.com/avvuses1/video/upload/v1790424232/landing-page-video.mp4"
              type="video/mp4"
            />
          </video>
        </div>
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow">Commercial &amp; Residential Roofing</p>
          <h1 className="hero-title">
            <span>Strong roofs.</span>
            <span className="dim">Higher standards.</span>
          </h1>
          <p className="hero-sub">Reliable. Durable. Built for Auckland.</p>
          <div className="hero-benefits">
            <span><i>◆</i>Quality workmanship</span>
            <span><i>◆</i>Commercial &amp; residential</span>
            <span><i>◆</i>On time, on budget</span>
            <span><i>◆</i>10-year workmanship warranty</span>
          </div>
          <button className="outline-btn" type="button" onClick={() => openQuote()}>
            Get a free quote <span>→</span>
          </button>
        </div>
        <p className="hero-tag">Roofing solutions<br />for Auckland's harshest weather</p>
        <a className="scroll-hint" href="#services">Scroll <span>↓</span></a>
      </section>

      <StatsBand />

      {/* ============ SERVICES ============ */}
      <section className="section services" id="services">
        <div className="section-image services-bg" />
        <div className="section-overlay" />
        <div className="section-inner">
          <p className="eyebrow reveal">Our services</p>
          <div className="section-heading reveal">
            <h2>Complete roofing<br />solutions.</h2>
            <p>Start with your property — then explore the systems we design and build for it. Choose your path below.</p>
            <a className="outline-btn" href="#service-grid">Explore our services <span>→</span></a>
          </div>

          <div className="audience-grid reveal" id="service-grid">
            <Link className="audience-card" to="/residential"
              style={{ '--bg': "url('/assets/img/audience-home.jpg')" } as React.CSSProperties}>
              <span className="audience-shade" />
              <span className="audience-body">
                <span className="audience-eyebrow">Homeowners &amp; Builders</span>
                <span className="audience-title">For your home.</span>
                <span className="audience-desc">Understand a leak, plan a replacement or choose a roof for a new build.</span>
              </span>
              <span className="audience-foot">
                <span>Residential roofing</span>
                <span className="audience-arrow">↗</span>
              </span>
            </Link>
            <Link className="audience-card" to="/commercial"
              style={{ '--bg': "url('/assets/img/audience-business.jpg')" } as React.CSSProperties}>
              <span className="audience-shade" />
              <span className="audience-body">
                <span className="audience-eyebrow">Owners &amp; Building Managers</span>
                <span className="audience-title">For your business.</span>
                <span className="audience-desc">Plan repairs and replacement around the building and the people using it.</span>
              </span>
              <span className="audience-foot">
                <span>Commercial roofing</span>
                <span className="audience-arrow">↗</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <ProcessSection />

      {/* ============ WHY CHOOSE US ============ */}
      <section className="section about" id="why">
        <div className="about-visual">
          <div className="about-image-note reveal">
            <span>Auckland roofing specialists</span>
            <strong>Built with precision.<br />Backed by experience.</strong>
          </div>
        </div>
        <div className="about-copy">
          <p className="eyebrow reveal">Why choose us</p>
          <h2 className="reveal">Built on experience.<br />Driven by quality.</h2>
          <p className="reveal">We partner with businesses, builders, body corporates and homeowners to deliver roofing that is reliable, durable and built to perform in Auckland conditions — from the first site inspection to long after the last screw is driven.</p>
          <a className="outline-btn reveal" href="#about">About ARP <span>→</span></a>
        </div>
        <div className="why-values reveal">
          <div className="trust-value">
            <svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.4-3 8.4-7 10-4-1.6-7-5.6-7-10V6l7-3z" /></svg>
            <div><strong>Licensed experts</strong><small>Qualified LBP professionals</small></div>
          </div>
          <div className="trust-value">
            <svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 7" /></svg>
            <div><strong>Quality assured</strong><small>Workmanship built to last</small></div>
          </div>
          <div className="trust-value">
            <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 100 18 9 9 0 000-18z" /><path d="M12 8v5M12 16h.01" /></svg>
            <div><strong>Safety first</strong><small>Site Safe certified crews</small></div>
          </div>
          <div className="trust-value">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
            <div><strong>Proven reliability</strong><small>On time and on budget</small></div>
          </div>
        </div>
      </section>

      {/* ============ PROJECTS ============ */}
      <ProjectsSection />

      {/* ============ ABOUT / STORY ============ */}
      <section className="section company-story" id="about">
        <div className="story-intro">
          <p className="eyebrow reveal">About us</p>
          <h2 className="reveal">Auckland's roofs.<br />Protected by professionals.</h2>
          <p className="story-lead reveal">Auckland Roof Professionals is an Auckland-based team delivering dependable roofing for commercial, industrial and residential properties.</p>
          <p className="reveal">We combine practical experience, licensed expertise and clear communication at every stage — from the first site inspection and detailed planning through to installation, clean-up and ongoing care.</p>
        </div>
        <div className="story-panel reveal">
          <img src="/assets/logo-navy.png" alt="Auckland Roof Professionals logo" />
          <p className="story-statement">"Our work is measured by what lasts: strong roofs, safe sites and relationships built on trust."</p>
          <div className="story-pillars">
            <article>
              <svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.4-3 8.4-7 10-4-1.6-7-5.6-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
              <div><strong>Qualified team</strong><span>Licensed Building Practitioners with safety-led delivery.</span></div>
            </article>
            <article>
              <svg viewBox="0 0 24 24"><path d="M3 17l6-10 4 6 3-4 5 8H3z" /><path d="M3 21h18" /></svg>
              <div><strong>Complete capability</strong><span>Metal, membrane, warm-roof and maintenance expertise.</span></div>
            </article>
            <article>
              <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></svg>
              <div><strong>Accountable service</strong><span>Honest advice, reliable timelines and lasting workmanship.</span></div>
            </article>
          </div>
        </div>

        {/* ============ WORKSHOP CONTACT & BRANCH LOCATION ============ */}
        <div className="about-workshop-grid reveal">
          {/* Card 1: Workshop Contact Details */}
          <div className="about-contact-card">
            <div className="about-contact-header">
              <span className="eyebrow">Direct Contact</span>
              <h3>Workshop &amp; Headquarters</h3>
            </div>
            <div className="about-contact-list">
              <div className="about-contact-item">
                <span className="about-contact-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <div>
                  <span className="about-contact-label">Phone</span>
                  <span className="about-contact-value">
                    <a href="tel:0800555766">0800 555 766</a>
                  </span>
                </div>
              </div>

              <div className="about-contact-item">
                <span className="about-contact-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <div>
                  <span className="about-contact-label">Email</span>
                  <span className="about-contact-value">
                    <a href="mailto:info@aucklandroofprofessionals.nz">info@aucklandroofprofessionals.nz</a>
                  </span>
                </div>
              </div>

              <div className="about-contact-item">
                <span className="about-contact-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <div>
                  <span className="about-contact-label">Workshop Address</span>
                  <span className="about-contact-value">
                    59 Porana Road, Glenfield, Auckland 0627
                  </span>
                </div>
              </div>

              <div className="about-contact-item">
                <span className="about-contact-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
                <div>
                  <span className="about-contact-label">Operating Hours</span>
                  <span className="about-contact-value">
                    Mon–Fri · 7:30am–5:00pm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Branch / Location Block (Matching Reference Image) */}
          <div className="about-branch-card">
            <div className="branch-header">
              <svg className="branch-pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7.4 11.85 7.4 11.85.34.3.86.3 1.2 0C12.6 21.85 20 15.25 20 10c0-4.42-3.58-8-8-8z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
              <h3>Visit our Branch</h3>
            </div>
            <p className="branch-address">59 Porana Road, Glenfield, Auckland 0627, New Zealand</p>
            <div className="branch-actions">
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=59+Porana+Road,+Glenfield,+Auckland+0627,+New+Zealand"
                target="_blank"
                rel="noopener noreferrer"
                className="branch-btn-primary"
              >
                <span>Get directions</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
              <a
                href="https://maps.app.goo.gl/CKoTxUWEz61N48q18"
                target="_blank"
                rel="noopener noreferrer"
                className="branch-btn-secondary"
              >
                View branch on Google Maps
              </a>
            </div>
          </div>
        </div>

        {/* ============ TALK TO OUR TEAM CTA ============ */}
        <div className="about-cta-wrap reveal">
          <button className="outline-btn" type="button" onClick={() => openQuote()}>
            Talk to our team <span>→</span>
          </button>
        </div>
      </section>

      {/* ============ TRUST BAND ============ */}
      <section className="section trust-band">
        <div className="trust-shade" />
        <div className="trust-image-heading reveal">
          <div>
            <p className="eyebrow">Skilled &amp; trusted</p>
            <h2>Expert hands.<br />Proven results.</h2>
          </div>
          <p>Auckland businesses and homeowners trust our licensed specialists for safe delivery, precise workmanship and dependable long-term protection.</p>
        </div>
      </section>

      <TestimonialsSection />

      <FaqSection />

      <MapBand />

      {/* ============ CONTACT ============ */}
      <section className="section contact" id="contact">
        <div className="contact-intro">
          <p className="eyebrow eyebrow-dark reveal">Get in touch</p>
          <h2 className="reveal">Let's talk about<br />your roof.</h2>
          <p className="reveal">Planning a new build, re-roof or maintenance programme? Tell us what you need and our team will be in touch within one business day.</p>
          <ul className="contact-facts reveal">
            <li><span>Phone</span><a href="tel:+64800555766">0800 555 766</a></li>
            <li><span>Email</span><a href="mailto:info@aucklandroofprofessionals.nz">info@aucklandroofprofessionals.nz</a></li>
            <li><span>Office</span>Unit 4, 120 Hugo Johnston Drive,<br />Penrose, Auckland 1061</li>
            <li><span>Hours</span>Mon–Fri · 7:30am–5:00pm</li>
          </ul>
        </div>
        <div className="inline-quote-panel reveal">
          <InlineQuoteForm />
        </div>
      </section>

      <CtaBand
        heading="Ready to raise the standard?"
        text="Get your free, no-obligation quote from Auckland's roof professionals."
      />
    </main>
  )
}
