/**
 * Source: the five original ProjectsSection records in HomePage.tsx.
 * Copy below only expands facts present in those summaries. Null fields are
 * intentionally unpublished, not evidence that an event did or did not occur.
 * Do not attach general Google reviews to an individual project without proof.
 */
export interface ProjectChallenge {
  title: string
  problem: string
  why: string | null
  approach: string | null
  solution: string
  outcome: string | null
}

export interface Project {
  num: string
  slug: string
  cat: string
  loc: string
  title: string
  desc: string
  seoTitle: string
  seoDescription: string
  lastModified?: string
  scope: string
  duration: string
  img: string
  alt: string
  imageKind: 'portfolio' | 'representative'
  focus: string
  client: string
  objectives: string[]
  approach: string
  designNote: string
  installationNote: string
  materials: { name: string; detail: string }[]
  challenges: ProjectChallenge[]
  deliverables: string[]
  results: string
  resultsPending: string
  serviceId: string
}

export const PROJECTS: Project[] = [
  {
    num: '01', slug: 'albany-commercial-centre', cat: 'Commercial',
    loc: 'Albany • Retail', title: 'Albany Commercial Centre',
    desc: '2,400m² standing seam metal roof and wall cladding upgrade, staged for zero downtime to trading tenants.',
    seoTitle: "Albany Commercial Centre Roof & Cladding Upgrade | ARP",
    seoDescription: "See the scope of a 2,400 m² standing seam metal roof and wall cladding upgrade at an Albany retail centre, planned in stages around tenants’ trading hours.",
    scope: 'Metal Roof + Cladding', duration: '6 Weeks',
    img: '/assets/img/project-albany.webp',
    alt: 'Existing Albany Commercial Centre portfolio image showing metal roofing and cladding',
    imageKind: 'portfolio', focus: 'A roof upgrade around a working retail centre.',
    client: 'A commercial retail centre in Albany with trading tenants. The existing project summary does not identify the client or centre operator.',
    objectives: ['Upgrade 2,400m² of metal roofing and wall cladding.', 'Stage the works around trading tenants, with zero downtime as the stated objective.'],
    approach: 'The published approach combines a standing seam metal roof and wall cladding upgrade with staged delivery. Keeping tenant trading in view is central to the existing brief.',
    designNote: 'Standing seam metal roofing and wall cladding are specified in the project summary. The roof area is listed as 2,400m².',
    installationNote: 'The summary describes staged work around trading tenants and lists a six-week duration. Individual work packages and dates are not supplied.',
    materials: [
      { name: 'Standing seam metal', detail: 'The roofing system named in the existing project summary.' },
      { name: 'Wall cladding', detail: 'Included in the envelope upgrade. The profile, coating and manufacturer are not recorded.' },
    ],
    challenges: [{
      title: 'Upgrading the roof while tenants trade',
      problem: 'The brief pairs a 2,400m² roof and cladding upgrade with the objective of zero downtime for trading tenants.',
      why: 'The project summary identifies an occupied retail setting, so continuity of trading is a requirement alongside the roofing work.',
      approach: 'Staged delivery is the approach stated in the existing summary. The detailed tenant coordination and access plan is not supplied.',
      solution: 'Standing seam metal roofing and wall cladding, delivered in stages.',
      outcome: null,
    }],
    deliverables: ['2,400m² roof upgrade', 'Standing seam metal roofing', 'Wall cladding upgrade'],
    results: 'The portfolio records the metal roof and cladding upgrade with a six-week duration. Staging addresses the brief’s trading-continuity objective; the summary does not include a verified downtime report.',
    resultsPending: 'Handover records, actual tenant downtime and before-and-after performance data have not been supplied.',
    serviceId: 'metal-roofs-cladding',
  },
  {
    num: '02', slug: 'remuera-villa-re-roof', cat: 'Residential',
    loc: 'Remuera • Re-roof', title: 'Remuera Villa Re-Roof',
    desc: 'Premium architectural asphalt shingle re-roof on a heritage-style family home, colour-matched to its original profile.',
    seoTitle: "Remuera Villa Re-Roof with Asphalt Shingles | ARP Case Study",
    seoDescription: "See how architectural asphalt shingles and a colour-matched finish were used to preserve the original roof profile of a heritage-style family villa in Remuera.",
    scope: 'Asphalt Shingles', duration: '2 Weeks',
    img: '/assets/img/project-remuera.webp',
    alt: 'Existing Remuera Villa Re-Roof portfolio image showing a shingle roof',
    imageKind: 'portfolio', focus: 'A new roof with respect for the original profile.',
    client: 'A heritage-style family home in Remuera. The homeowner’s name and original brief are not included in the existing project material.',
    objectives: ['Re-roof the family home with architectural asphalt shingles.', 'Colour-match the roof to the home’s original profile.'],
    approach: 'The project summary centres on material selection and visual continuity: architectural asphalt shingles with a colour match to the original profile.',
    designNote: 'Architectural asphalt shingles and colour matching to the original profile are described in the existing summary.',
    installationNote: 'The portfolio describes a shingle re-roof and lists a two-week duration. The removal sequence and installation dates are not recorded.',
    materials: [
      { name: 'Architectural asphalt shingles', detail: 'The roof covering identified in the project summary. Brand and product specification are awaiting confirmation.' },
      { name: 'Colour-matched finish', detail: 'The summary states that the finish was matched to the home’s original profile. The selected colour is not named.' },
    ],
    challenges: [{
      title: 'Retaining the character of a family home',
      problem: 'The re-roof needed to work with the original profile of a heritage-style home.',
      why: 'The original profile and colour match are explicitly part of the project description.',
      approach: null,
      solution: 'Architectural asphalt shingles, colour-matched to the original profile.',
      outcome: null,
    }],
    deliverables: ['Architectural asphalt shingle re-roof', 'Finish colour-matched to the original profile'],
    results: 'The existing portfolio records the shingle re-roof, its colour-matched finish and a two-week duration. These deliverables address the stated intention to retain the home’s original profile.',
    resultsPending: 'The approved colour schedule, final inspection, homeowner sign-off and any measured improvements have not been supplied.',
    serviceId: 'asphalt-shingles',
  },
  {
    num: '03', slug: 'east-tamaki-warehouse', cat: 'Industrial',
    loc: 'East Tāmaki • Logistics', title: 'East Tāmaki Warehouse',
    desc: 'Engineered warm roof system with high-performance PIR insulation for a temperature-sensitive distribution centre.',
    seoTitle: "East Tāmaki Warehouse Warm Roof with PIR Insulation | ARP",
    seoDescription: "Explore the engineered warm roof and high-performance PIR insulation specified for a temperature-sensitive distribution centre in East Tāmaki, Auckland.",
    scope: 'Warm Roof + PIR', duration: '4 Weeks',
    img: '/assets/img/project-warehouse.webp',
    alt: 'Existing East Tāmaki Warehouse portfolio image showing the distribution building roof',
    imageKind: 'portfolio', focus: 'Roofing for a temperature-sensitive operation.',
    client: 'A temperature-sensitive distribution centre in East Tāmaki. The existing summary identifies the logistics setting but does not name the operator or the goods handled.',
    objectives: ['Provide an engineered warm roof system for the distribution centre.', 'Incorporate high-performance PIR insulation for the temperature-sensitive setting.'],
    approach: 'The published solution pairs an engineered warm roof system with PIR insulation. The building’s temperature-sensitive use is the context given for this specification.',
    designNote: 'An engineered warm roof system with high-performance PIR insulation is named in the portfolio summary.',
    installationNote: 'The warm roof project is listed with a four-week duration. Work sequencing and dated installation milestones are not supplied.',
    materials: [
      { name: 'Engineered warm roof', detail: 'The assembly type recorded in the summary. Layer build-up and waterproofing product are not specified.' },
      { name: 'PIR insulation', detail: 'High-performance insulation is named in the summary. Thickness and tested thermal values are not provided.' },
    ],
    challenges: [{
      title: 'Responding to a temperature-sensitive use',
      problem: 'The distribution centre is described as temperature-sensitive, making the roof’s insulation a central part of the brief.',
      why: null,
      approach: 'An engineered warm roof with PIR insulation is the approach recorded in the existing summary.',
      solution: 'A warm roof system incorporating high-performance PIR insulation.',
      outcome: null,
    }],
    deliverables: ['Engineered warm roof system', 'High-performance PIR insulation'],
    results: 'The portfolio records a warm roof system with PIR insulation and a four-week duration. The system addresses the insulation focus in the brief; no operating-temperature or energy-use measurements are provided.',
    resultsPending: 'Design targets, measured temperatures, energy data and final thermal-performance records have not been supplied.',
    serviceId: 'warmroof-commercial',
  },
  {
    num: '04', slug: 'takapuna-medical-centre', cat: 'Commercial',
    loc: 'Takapuna • Healthcare', title: 'Takapuna Medical Centre',
    desc: 'Complete architectural standing seam roofing with enhanced acoustic insulation and custom perimeter flashings.',
    seoTitle: "Takapuna Medical Centre Standing Seam Roof Case Study",
    seoDescription: "Explore the Takapuna Medical Centre roofing project, featuring an standing seam metal roof, enhanced acoustic insulation and custom perimeter flashings.",
    scope: 'Standing Seam Metal', duration: '5 Weeks',
    img: '/assets/img/svc-metal-commercial.webp',
    alt: 'Representative metal roofing service image, not verified as Takapuna Medical Centre',
    imageKind: 'representative', focus: 'Architectural roofing with an acoustic focus.',
    client: 'A medical centre in Takapuna. The healthcare setting is stated in the portfolio; the practice name, operator and operational brief are not supplied.',
    objectives: ['Provide architectural standing seam roofing.', 'Include enhanced acoustic insulation and custom perimeter flashings.'],
    approach: 'The published scope brings together standing seam roofing, enhanced acoustic insulation and purpose-made perimeter flashings. No detailed design or installation methodology accompanies the summary.',
    designNote: 'Standing seam roofing, enhanced acoustic insulation and custom perimeter flashings are all named in the existing scope.',
    installationNote: 'The portfolio lists a five-week duration for the roofing work. Installation milestones and any clinical-access arrangements are not supplied.',
    materials: [
      { name: 'Standing seam roofing', detail: 'Architectural metal roofing is identified in the project summary.' },
      { name: 'Acoustic insulation', detail: 'Enhanced acoustic insulation is included in the scope. Product details and acoustic test results are not provided.' },
      { name: 'Custom perimeter flashings', detail: 'Bespoke perimeter detailing is stated in the scope. Drawings and dimensions are awaiting confirmation.' },
    ],
    challenges: [{
      title: 'Combining roof detailing and acoustic requirements',
      problem: 'The project scope combines architectural roofing with enhanced acoustic insulation and custom perimeter detailing.',
      why: null,
      approach: null,
      solution: 'Standing seam roofing with enhanced acoustic insulation and custom perimeter flashings.',
      outcome: null,
    }],
    deliverables: ['Architectural standing seam roofing', 'Enhanced acoustic insulation', 'Custom perimeter flashings'],
    results: 'The portfolio records the architectural roofing package and a five-week duration. The listed insulation and flashing details respond to the scope; verified acoustic results and handover documentation are not available.',
    resultsPending: 'Acoustic testing, project-specific completion photographs and client acceptance records have not been supplied.',
    serviceId: 'metal-roofs-cladding',
  },
  {
    num: '05', slug: 'devonport-coastal-villa', cat: 'Residential',
    loc: 'Devonport • Coastal', title: 'Devonport Coastal Villa',
    desc: 'Marine-grade Colorsteel replacement engineered for high wind zones and salt-spray resistance with traditional profile lines.',
    seoTitle: "Devonport Coastal Villa Colorsteel Re-Roof | ARP Case Study",
    seoDescription: "See why marine-grade Colorsteel Maxx was specified for a coastal Devonport villa re-roof, with high winds, salt spray and a traditional roof profile in mind.",
    scope: 'Colorsteel Maxx', duration: '3 Weeks',
    img: '/assets/img/svc-metal-res.webp',
    alt: 'Representative residential metal roofing service image, not verified as Devonport Coastal Villa',
    imageKind: 'representative', focus: 'Traditional lines for a coastal setting.',
    client: 'A coastal villa in Devonport. The portfolio identifies the residential setting; the homeowner and exact property details are not published.',
    objectives: ['Replace the roof with marine-grade Colorsteel, listed as Colorsteel Maxx.', 'Address high wind zones and salt-spray exposure while retaining traditional profile lines.'],
    approach: 'The existing brief combines a marine-grade Colorsteel replacement with engineering for high wind zones and salt-spray resistance. Traditional profile lines remain part of the stated design.',
    designNote: 'The summary specifies marine-grade Colorsteel, high-wind engineering, salt-spray resistance and traditional profile lines.',
    installationNote: 'The portfolio lists the Colorsteel replacement with a three-week duration. The construction sequence and installation dates are not supplied.',
    materials: [
      { name: 'Colorsteel Maxx', detail: 'The material named in the original scope. The full product and coating specification is awaiting confirmation.' },
      { name: 'Traditional profile', detail: 'Traditional profile lines are described in the summary. Profile dimensions and fixing details are not provided.' },
    ],
    challenges: [{
      title: 'Coastal exposure, traditional profile',
      problem: 'The brief identifies high wind zones and salt-spray resistance alongside a traditional roof profile.',
      why: 'Wind exposure, salt spray and the desired profile are all requirements stated in the original summary.',
      approach: 'A marine-grade replacement engineered for the stated exposure is the approach described in the portfolio.',
      solution: 'Colorsteel Maxx roofing with traditional profile lines.',
      outcome: null,
    }],
    deliverables: ['Marine-grade Colorsteel roof replacement', 'Traditional roof profile lines'],
    results: 'The existing portfolio records a Colorsteel replacement and a three-week duration. The specification addresses the stated coastal-exposure brief; no measured weathering or long-term performance results are supplied.',
    resultsPending: 'Engineering documentation, final inspection records and longer-term performance evidence have not been supplied.',
    serviceId: 'metal-roofs-res',
  },
]

export const getProject = (slug?: string) => PROJECTS.find((project) => project.slug === slug)
export const projectPath = (project: Project) => `/projects/${project.slug}`

export function adjacentProjects(project: Project) {
  const index = PROJECTS.findIndex(({ slug }) => slug === project.slug)
  return {
    previous: PROJECTS[(index - 1 + PROJECTS.length) % PROJECTS.length],
    next: PROJECTS[(index + 1) % PROJECTS.length],
  }
}
