/* Shared services catalogue (ported from app.js SERVICES). */

export interface Service {
  id: string
  num: string
  badge: string
  title: string
  img: string
  short: string
  chips: string[]
  desc: string
  specs: string[]
}

export const SERVICES: Service[] = [
  // COMMERCIAL
  {
    id: 'metal-roofs-cladding', num: '01', badge: 'Commercial',
    title: 'Metal Roofs & Cladding',
    img: '/assets/img/svc-metal-commercial.jpg',
    short: 'Standing seam, long-run and architectural cladding systems engineered for commercial buildings.',
    chips: ['Standing seam', 'Long run', 'Wall cladding', 'Colorsteel®'],
    desc: "We design and install premium metal roofing and cladding systems for offices, warehouses, retail and industrial buildings. From crisp standing seam to cost-effective long run, every system is specified for Auckland's wind zones and coastal conditions, and installed by our own licensed crews.",
    specs: [
      'Colorsteel® and Zincalume® systems with full manufacturer warranties',
      'Standing seam, trough and Euro tray profiles',
      'Integrated wall cladding and architectural flashings',
      'Wind-zone engineering for exposed Auckland sites',
      'Staged installation to keep your business operating',
    ],
  },
  {
    id: 'membrane-commercial', num: '02', badge: 'Commercial',
    title: 'Membrane Roofing',
    img: '/assets/img/svc-membrane-commercial.jpg',
    short: 'High-performance TPO and torch-on waterproofing for flat and low-slope commercial roofs.',
    chips: ['TPO', 'Torch-on', 'Butynol', 'Low-slope'],
    desc: 'Seamless, watertight membrane systems for flat and low-slope commercial roofs — including warm-roof build-ups, green roofs and rooftop plant areas. We are certified applicators for leading TPO, torch-on and butynol systems, with documented QA at every stage.',
    specs: [
      'TPO-related single-ply and torch-on bitumen systems',
      'Full substrate preparation and falls correction',
      'Rooftop plant, penetration and upstand detailing',
      'Flood testing and electronic leak detection available',
      '20-year system warranty options',
    ],
  },
  {
    id: 'warmroof-commercial', num: '03', badge: 'Commercial',
    title: 'Warm Roof Systems',
    img: '/assets/img/svc-warmroof-commercial.jpg',
    short: 'Insulated roof assemblies that eliminate condensation and slash energy costs.',
    chips: ['PIR insulation', 'Condensation control', 'Energy efficiency'],
    desc: 'A warm roof places insulation above the roof deck, keeping the structure at room temperature and eliminating condensation inside the building envelope. Ideal for temperature-sensitive warehouses, cool stores and offices — and a smart upgrade for aging commercial roofs.',
    specs: [
      'High thermal-performance PIR insulation boards',
      'Condensation and thermal modelling for your building',
      'Compatible with TPO and torch-on membranes',
      'Meets and exceeds NZ Building Code H1 requirements',
      'Measurable reductions in heating and cooling costs',
    ],
  },
  {
    id: 'roof-safety-systems', num: '04', badge: 'Commercial',
    title: 'Roof Safety Systems',
    img: '/assets/img/svc-safety.jpg',
    short: 'Anchor points, static lines, walkways and guardrails that keep your site compliant and safe.',
    chips: ['Anchor points', 'Static lines', 'Guardrails', 'Walkways'],
    desc: 'Protect everyone who accesses your roof. We design, install and certify height-safety systems — from discreet anchor points to full perimeter guardrail and walkway networks — so maintenance can happen safely and your building stays compliant.',
    specs: [
      'Fall-arrest anchor points and static line systems',
      'Edge protection and fixed guardrail installations',
      'Anti-slip roof walkways for safe plant access',
      'Annual recertification and inspection programmes',
      'Compliant with AS/NZS 1891 and WorkSafe guidance',
    ],
  },
  {
    id: 'asset-maintenance', num: '05', badge: 'Commercial',
    title: 'Asset Maintenance',
    img: '/assets/img/svc-maintenance.jpg',
    short: 'Proactive inspection and maintenance programmes that extend roof life and protect budgets.',
    chips: ['Scheduled inspections', 'Leak response', 'Condition reports'],
    desc: 'Your roof is a capital asset — treat it like one. Our maintenance programmes combine scheduled inspections, drone condition surveys and priority repair response to catch small issues before they become six-figure problems.',
    specs: [
      'Scheduled inspection and gutter-clearing programmes',
      'Drone roof condition surveys with photo reporting',
      'Priority leak detection and repair response',
      'Lifecycle forecasting and budget planning support',
      'Portfolio-wide programmes for property managers',
    ],
  },
  // RESIDENTIAL
  {
    id: 'asphalt-shingles', num: '06', badge: 'Residential · Specialised',
    title: 'Asphalt Shingles',
    img: '/assets/img/svc-shingles.jpg',
    short: 'Specialised architectural shingle installation with premium fire, wind and UV resistance.',
    chips: ['Architectural shingles', 'Heritage profiles', 'Re-roofs'],
    desc: "Our residential speciality. Architectural asphalt shingles deliver the depth and texture of slate or shake at a fraction of the weight — with outstanding performance in Auckland's wind, rain and UV. We are certified installers for leading shingle systems, from new builds to heritage re-roofs.",
    specs: [
      'Certified installers of premium shingle systems',
      'Architectural, slate-look and heritage profiles',
      'Excellent fire, wind and UV resistance ratings',
      'Full re-roof including underlay and flashings',
      'Up to 30-year manufacturer warranties',
    ],
  },
  {
    id: 'metal-roofs-res', num: '07', badge: 'Residential',
    title: 'Metal Roofs',
    img: '/assets/img/svc-metal-res.jpg',
    short: 'Colorsteel® and long-run steel systems built for Auckland homes and coastal conditions.',
    chips: ['Colorsteel®', 'Long run', 'Coastal-grade'],
    desc: 'The classic Kiwi roof, done properly. We install long-run Colorsteel® and Zincalume® roofing in profiles and colours to suit everything from villas to architectural new builds — with the detailing and flashings that make all the difference to lifespan.',
    specs: [
      'Genuine Colorsteel® in the full colour range',
      'Corrugate, trough and Euro tray profiles',
      'Coastal-grade substrates for seaside homes',
      'Tile-to-metal conversions available',
      'New fascia, spouting and downpipes bundled',
    ],
  },
  {
    id: 'membrane-res', num: '08', badge: 'Residential',
    title: 'Membrane Roofing',
    img: '/assets/img/svc-membrane-res.jpg',
    short: 'Seamless waterproofing for flat roofs, decks and low-pitch modern homes.',
    chips: ['Flat roofs', 'Decks', 'Low-pitch'],
    desc: 'Modern low-pitch homes and rooftop decks demand flawless waterproofing. Our membrane systems create a seamless, trafficable surface with clean lines — ideal for contemporary architecture, extensions and garage roofs.',
    specs: [
      'TPO, torch-on and butynol options',
      'Trafficable finishes for rooftop decks',
      'Falls correction and substrate rebuilds',
      'Clean, low-profile edge detailing',
      'Ideal for low-pitch architectural homes',
    ],
  },
  {
    id: 'warmroof-res', num: '09', badge: 'Residential',
    title: 'Warm Roof Systems',
    img: '/assets/img/svc-warmroof-res.jpg',
    short: 'Thermal-efficient warm roof upgrades for a warmer, drier home year-round.',
    chips: ['Retrofits', 'New builds', 'Condensation-free'],
    desc: 'Eliminate condensation and winter heat loss with a residential warm roof system. By insulating above the deck, your home stays warmer, drier and healthier — a premium upgrade for low-slope homes and new architectural builds.',
    specs: [
      'Warm roof retrofits during re-roofing',
      'High-performance PIR insulation',
      'Eliminates internal condensation and mould risk',
      'Exceeds current H1 thermal requirements',
      'Quieter roof in heavy rain',
    ],
  },
]

export const isCommercialService = (s: Service) => s.badge.startsWith('Commercial')
