import { Link } from 'react-router-dom'
import { useSEO } from '../hooks/useSEO'
import { pageSEO } from '../lib/page-seo'
import './legal.css'

const pages = {
  privacy: {
    title: 'Privacy Policy',
    path: '/privacy-policy',
    description: 'How Auckland Roof Professionals Ltd handles personal information when you use our website or contact us about roofing work.',
  },
  terms: {
    title: 'Terms & Conditions',
    path: '/terms-and-conditions',
    description: 'These terms cover the use of the Auckland Roof Professionals Ltd website and how website enquiries relate to roofing quotes and agreements.',
  },
} as const

const email = 'info@aucklandroofprofessionals.nz'

function PrivacyPolicy() {
  return (
    <>
      <section>
        <h2>Information we collect</h2>
        <p>When you contact us or request a quote, we may collect your name, email address, phone number, preferred contact method, and the details you provide about your property or project. This can include its location, the roofing work you need, your preferred timing, and any photos or files you choose to send.</p>
        <p>You can choose what information to provide. If we do not have enough detail to understand your request or contact you, we may be unable to respond or prepare a quote.</p>
      </section>
      <section>
        <h2>How we use your information</h2>
        <p>We use the information you provide to respond to enquiries, assess roofing needs, arrange site visits, prepare quotes, and communicate about work you ask us to carry out. We may use technical information such as your IP address to help protect our forms from spam and misuse.</p>
      </section>
      <section>
        <h2>Who may receive your information</h2>
        <p>We may share relevant information with providers who support our website and communications, or with contractors and suppliers when they need it to assess or carry out your project. We may also disclose information where the law requires or permits it.</p>
        <p>Our website links to other sites and includes services such as embedded Google Maps. Those providers may handle information about your visit under their own privacy policies.</p>
      </section>
      <section>
        <h2>How we protect and keep your information</h2>
        <p>We take reasonable steps to protect personal information from loss, misuse, and unauthorised access. We keep it for as long as needed for the purpose it was collected for and to meet any applicable legal or record-keeping obligations.</p>
      </section>
      <section>
        <h2>Access, correction and privacy enquiries</h2>
        <p>Under New Zealand’s Privacy Act 2020, you can ask for access to the personal information we hold about you and request a correction. Email <a href={`mailto:${email}`}>{email}</a> or write to Auckland Roof Professionals Ltd, 59/7 Porana Road, Wairau Valley, Auckland 0627, New Zealand.</p>
        <p>If you are concerned about how we have handled your information, you can also contact the Office of the Privacy Commissioner.</p>
      </section>
    </>
  )
}

function TermsAndConditions() {
  return (
    <>
      <section>
        <h2>Website information</h2>
        <p>The website provides general information about our roofing services. Suitability, materials, costs and timelines depend on your property and the work involved. Please contact us for advice about your project before making decisions based on general website information.</p>
      </section>
      <section>
        <h2>Enquiries, quotes and project agreements</h2>
        <p>Submitting an enquiry or asking for a quote starts a conversation about your project. It does not confirm a booking or authorise work to begin. The agreed scope, price, payment terms, timing and any applicable warranties are set out in the quote or agreement for your job.</p>
        <p>Site conditions, weather, material availability or changes to the scope can affect the work. Any changes to the agreed work or price are dealt with under your project agreement.</p>
      </section>
      <section>
        <h2>Acceptable use and website content</h2>
        <p>Use the website lawfully and provide accurate information when contacting us. Only send photos or documents that you are entitled to share. Please do not use our forms to send spam or harmful files, or interfere with the operation of the website.</p>
        <p>You may view and share links to our pages. Reproducing our branding, text or photographs requires permission from the relevant rights holder unless the law permits that use.</p>
      </section>
      <section>
        <h2>Privacy and external sites</h2>
        <p>See our <Link to="/privacy-policy">Privacy Policy</Link> for information about how we handle personal information. Linked websites are operated by their respective providers and may have their own terms.</p>
      </section>
      <section>
        <h2>New Zealand law and consumer rights</h2>
        <p>New Zealand law applies to these website terms. Your rights and remedies under the Consumer Guarantees Act 1993, the Fair Trading Act 1986 and other applicable laws continue to apply where they cannot lawfully be excluded or limited.</p>
      </section>
      <section>
        <h2>Questions about these terms</h2>
        <p>Email <a href={`mailto:${email}`}>{email}</a> or use our <Link to="/contact">contact page</Link> if you have a question about these terms or a roofing enquiry.</p>
      </section>
    </>
  )
}

export default function LegalPage({ page }: { page: keyof typeof pages }) {
  const { title, description, path } = pages[page]
  useSEO(pageSEO[path])

  return (
    <main id="main-content" tabIndex={-1} className="legal-page">
      <header className="legal-masthead">
        <div className="container">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      <div className="container legal-content">
        {page === 'privacy' ? <PrivacyPolicy /> : <TermsAndConditions />}
      </div>
    </main>
  )
}
