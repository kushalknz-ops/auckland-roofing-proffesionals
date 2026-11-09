import { useEffect, useRef } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { adjacentProjects, getProject, projectPath, type Project } from '../data/projects'
import { SERVICES } from '../data/services'
import { useQuote } from '../components/site/quote-context'
import { useSEO } from '../hooks/useSEO'
import { getProjectSEO } from '../lib/project-seo'
import { getResponsiveImageProps } from '../lib/responsive-images'
import NotFoundPage from './NotFoundPage'
import '../project.css'

const chapters = [
  ['overview', 'Overview'], ['journey', 'Project journey'], ['challenges', 'Challenges & solutions'],
  ['approach', 'Approach & materials'], ['experience', 'Client experience'], ['results', 'Results & impact'],
] as const

function Pending({ children }: { children: React.ReactNode }) {
  return <p className="case-pending"><span>Awaiting project record</span>{children}</p>
}

function ProjectImage({ project, priority = false, thumbnail = false }: { project: Project; priority?: boolean; thumbnail?: boolean }) {
  const sizes = thumbnail
    ? '(max-width: 800px) calc((100vw - 64px) / 2), (max-width: 1050px) 76px, 100px'
    : priority
      ? '(max-width: 800px) calc(100vw - 32px), (max-width: 1200px) 52vw, 600px'
      : '(max-width: 800px) calc(100vw - 32px), (max-width: 1050px) calc(100vw - 254px), (max-width: 1200px) calc(100vw - 317px), 883px'
  return <img src={project.img} alt={project.alt} width={1536} height={1024}
    {...getResponsiveImageProps(project.img, sizes)}
    loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" />
}

function Journey({ project }: { project: Project }) {
  const stages = [
    { title: 'Consultation & discovery', text: null, pending: `The initial site assessment, client brief and discovery notes for ${project.title} have not been supplied.` },
    { title: 'Research & planning', text: null, pending: 'The agreed programme, material research, access planning and dated milestones are not available.' },
    { title: 'Design & specification', text: project.designNote, pending: 'Approved drawings, product selections and the design approval date are not available.' },
    { title: 'Installation & implementation', text: project.installationNote, pending: 'The site diary, installation sequence and progress photographs are not available.' },
    { title: 'Testing & quality assurance', text: null, pending: 'Inspection checklists, testing methods, results and any remedial work are not documented in the available material.' },
    { title: 'Final delivery & handover', text: null, pending: 'The completion date, handover pack, maintenance guidance and client sign-off have not been supplied.' },
  ]
  return (
    <section id="journey" className="case-section case-journey" aria-labelledby="journey-title">
      <h2 id="journey-title">From brief to handover.</h2>
      <p>Explore the six roofing stages. The portfolio lists <strong>{project.duration.toLowerCase()}</strong> overall; stage dates and detailed records are awaiting confirmation.</p>
      <p className="case-journey-hint">Select a stage to see the available information <ArrowDown size={15} aria-hidden="true" /></p>
      <ol className="case-timeline">
        {stages.map((stage, index) => (
          <li key={stage.title}>
            <span className="case-stage-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <details open={index === 0}>
              <summary><h3>{stage.title}</h3><span className="case-stage-date">Date pending</span><ChevronDown size={18} aria-hidden="true" /></summary>
              <div className="case-stage-content">
                {stage.text && <p>{stage.text}</p>}
                <Pending>{stage.pending}</Pending>
              </div>
            </details>
          </li>
        ))}
      </ol>
      <p className="case-timeline-note">This is a framework for the project record, not a dated construction programme. No unrecorded milestone is presented as completed.</p>
    </section>
  )
}

function CaseStudy({ project }: { project: Project }) {
  const { previous, next } = adjacentProjects(project)
  const { openQuote } = useQuote()
  const mainRef = useRef<HTMLElement>(null)
  const service = SERVICES.find(({ id }) => id === project.serviceId)
  useSEO(getProjectSEO(project))

  useEffect(() => {
    // The content stays visible before hydration, without JS and with reduced motion.
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('case-in-view')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.08 })
    mainRef.current?.querySelectorAll('.case-section').forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [project.slug])

  return (
    <main id="main-content" tabIndex={-1} className="case-study" ref={mainRef}>
      <header className="case-hero">
        <div className="container">
          <nav className="case-breadcrumbs" aria-label="Breadcrumb">
            <ol>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/#projects">Projects</Link></li>
              <li><span aria-current="page">{project.title}</span></li>
            </ol>
          </nav>
          <div className="case-hero-layout">
            <div className="case-hero-copy">
              <h1>{project.title}</h1>
              <p className="case-hero-focus">{project.focus}</p>
              <p className="case-hero-intro">{project.desc}</p>
              <a className="case-read-link" href="#overview">Explore the case study <ArrowDown size={18} aria-hidden="true" /></a>
            </div>
            <figure className="case-hero-image">
              <ProjectImage project={project} priority />
              <figcaption>{project.imageKind === 'representative' ? 'Representative service image · project photography pending' : 'Existing portfolio image · image provenance awaiting confirmation'}</figcaption>
            </figure>
          </div>
        </div>
      </header>

      <div className="case-facts-band">
        <dl className="container case-facts">
          <div><dt>Location & setting</dt><dd>{project.loc}</dd></div>
          <div><dt>Project type</dt><dd>{project.cat}</dd></div>
          <div><dt>Roofing scope</dt><dd>{project.scope}</dd></div>
          <div><dt>Listed duration</dt><dd>{project.duration}</dd></div>
        </dl>
      </div>

      <div className="container case-body">
        <aside className="case-sidebar">
          <nav aria-label="Case study chapters">
            <p>Inside this project</p>
            <ol>{chapters.map(([id, title]) => <li key={id}><a href={`#${id}`}>{title}</a></li>)}</ol>
          </nav>
          <Link className="case-back" to="/#projects"><ArrowLeft size={16} aria-hidden="true" /> All projects</Link>
        </aside>

        <div className="case-story">
          <section id="overview" className="case-section" aria-labelledby="overview-title">
            <h2 id="overview-title">The project at a glance.</h2>
            <p className="case-lead">{project.focus}</p>
            <div className="case-editorial-pair">
              <div><h3>The client & setting</h3><p>{project.client}</p></div>
              <div><h3>The brief</h3><ul className="case-objectives">{project.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></div>
            </div>
            <h3>The proposed direction</h3>
            <p>{project.approach}</p>
            <div className="case-record-note">
              <strong>About this case study</strong>
              <p>Scope, duration and project descriptions come from the existing portfolio. Detailed records are still to be added. Placeholders are labelled throughout; client feedback and measured results are only included when supported by project records.</p>
            </div>
          </section>

          <Journey project={project} />

          <section id="challenges" className="case-section" aria-labelledby="challenges-title">
            <h2 id="challenges-title">The challenge. The response.</h2>
            <p>The requirements below are recorded in the existing summary. Additional site obstacles and how they were resolved are awaiting project documentation.</p>
            {project.challenges.map((challenge) => (
              <details className="case-challenge" key={challenge.title} open>
                <summary><h3>{challenge.title}</h3><ChevronDown size={20} aria-hidden="true" /></summary>
                <dl className="case-challenge-content">
                  <div><dt>The problem</dt><dd>{challenge.problem}</dd></div>
                  <div><dt>Why it mattered</dt><dd>{challenge.why ?? <Pending>The specific technical or business constraints have not been supplied.</Pending>}</dd></div>
                  <div><dt>The approach</dt><dd>{challenge.approach ?? <Pending>Assessment notes, options considered and the decision process have not been supplied.</Pending>}</dd></div>
                  <div><dt>The solution in the scope</dt><dd>{challenge.solution}</dd></div>
                  <div className="case-challenge-outcome"><dt>The outcome</dt><dd>{challenge.outcome ?? <Pending>Evidence confirming how this requirement was met at handover has not been supplied.</Pending>}</dd></div>
                </dl>
              </details>
            ))}
          </section>

          <section id="approach" className="case-section" aria-labelledby="approach-title">
            <h2 id="approach-title">The system behind the roof.</h2>
            <p>{project.approach}</p>
            <h3>Materials & features</h3>
            <dl className="case-materials">{project.materials.map((material) => (
              <div key={material.name}><dt>{material.name}</dt><dd>{material.detail}</dd></div>
            ))}</dl>
            <Pending>Detailed installation methods, site tools, product schedules and approved technical drawings have not been supplied.</Pending>
            <figure className="case-detail-image">
              <ProjectImage project={project} />
              <figcaption>{project.imageKind === 'representative'
                ? 'The existing carousel uses this service image. It is representative and is not verified photography of this project.'
                : 'Full view of the image used in the existing project carousel. Before-and-after images and construction photographs are awaiting confirmation.'}</figcaption>
            </figure>
            {service && <Link className="case-text-link" to={`/service/${service.id}`}>Explore {service.title.toLowerCase()} <ArrowUpRight size={17} aria-hidden="true" /></Link>}
          </section>

          <section id="experience" className="case-section case-experience" aria-labelledby="experience-title">
            <h2 id="experience-title">The client’s perspective.</h2>
            <p>No attributable feedback for {project.title} has been supplied. The following spaces are reserved for the client’s own account.</p>
            <div className="case-feedback-grid">
              <div><h3>Initial concept</h3><Pending>The client’s response to the proposed scope and solution.</Pending></div>
              <div><h3>During the works</h3><Pending>The client’s experience of communication and installation.</Pending></div>
              <div><h3>Feedback & refinements</h3><Pending>Requested changes, the team’s response and agreed revisions.</Pending></div>
              <div><h3>Final delivery</h3><Pending>Client sign-off, satisfaction and an approved testimonial.</Pending></div>
            </div>
          </section>

          <section id="results" className="case-section" aria-labelledby="results-title">
            <h2 id="results-title">What the project delivered.</h2>
            <p>{project.results}</p>
            <h3>Deliverables listed in the portfolio</h3>
            <ul className="case-deliverables">{project.deliverables.map((item) => <li key={item}><ArrowUpRight size={18} aria-hidden="true" />{item}</li>)}</ul>
            <Pending>{project.resultsPending}</Pending>
          </section>
        </div>
      </div>

      <section className="case-cta" aria-labelledby="case-cta-title">
        <div className="container case-cta-inner">
          <div><h2 id="case-cta-title">A similar project<br />in mind?</h2><p>Tell us about your property, your priorities and what you need from your roof.</p></div>
          <div className="case-cta-actions">
            <button type="button" onClick={(event) => openQuote(event.currentTarget, service?.title)}>Discuss a similar project <ArrowUpRight size={20} aria-hidden="true" /></button>
            <a href="tel:+64800766311">Or call 0800 766 311</a>
          </div>
        </div>
      </section>

      <nav className="container case-pagination" aria-label="Project navigation">
        <Link to={projectPath(previous)} className="case-adjacent" rel="prev">
          <ProjectImage project={previous} thumbnail />
          <span><small><ArrowLeft size={16} aria-hidden="true" /> Previous project</small><strong>{previous.title}</strong></span>
        </Link>
        <Link to={projectPath(next)} className="case-adjacent case-adjacent-next" rel="next">
          <span><small>Next project <ArrowRight size={16} aria-hidden="true" /></small><strong>{next.title}</strong></span>
          <ProjectImage project={next} thumbnail />
        </Link>
        <Link className="case-all-projects" to="/#projects">Back to all projects <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </nav>
    </main>
  )
}

export default function ProjectPage() {
  const { slug } = useParams()
  const project = getProject(slug)
  return project ? <CaseStudy key={project.slug} project={project} /> : <NotFoundPage />
}
