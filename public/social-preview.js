const PAGES = {
  home: {
    title: "Auckland Roof Professionals | Roofing & Re-Roofing",
    desc: "Get a free roofing quote from Auckland Roof Professionals. Explore metal roofing, membranes, warm roofs and asphalt shingles for homes and commercial buildings.",
    url: "https://aucklandroofprofessionals.nz/",
    img: "/assets/social/roofing-v2.jpg",
    alt: "Auckland Roof Professionals: Commercial and residential roofing"
  },
  commercial: {
    title: "Commercial Roofing & Cladding in Auckland | ARP Roofers",
    desc: "Plan commercial roofing and cladding in Auckland. Compare standing seam metal, TPO membranes and warm roofs, and ask about roof safety and ongoing maintenance.",
    url: "https://aucklandroofprofessionals.nz/commercial",
    img: "/assets/social/commercial-v2.jpg",
    alt: "Auckland Roof Professionals: Commercial roofing and cladding"
  },
  residential: {
    title: "Residential Roofing & Re-Roofing in Auckland | ARP",
    desc: "Find the right roof for your Auckland home. Compare Colorsteel metal roofing, asphalt shingles, waterproof membranes and insulated warm roofs. Request a quote.",
    url: "https://aucklandroofprofessionals.nz/residential",
    img: "/assets/social/residential-v2.jpg",
    alt: "Auckland Roof Professionals: Residential roofing and re-roofing"
  },
  contact: {
    title: "Free Roofing Quotes | Contact Auckland Roof Professionals",
    desc: "Request a free roofing quote or on-site assessment in Auckland. Call 0800 766 311 or contact our Wairau Valley team for residential and commercial roofing.",
    url: "https://aucklandroofprofessionals.nz/contact",
    img: "/assets/social/contact-v2.jpg",
    alt: "Request a free roof quote from Auckland Roof Professionals"
  }
};

const imageOrigin = new URL(document.querySelector('meta[property="og:image"]')?.content ?? PAGES.home.url).origin;

function switchPage(key) {
  const data = PAGES[key];
  if (!data) return;
  document.querySelectorAll('.tab-btn').forEach(button => {
    const selected = button.dataset.page === key;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  // Update Images
  ['fb-img', 'li-img', 'tw-img', 'wa-img'].forEach(id => {
    const image = document.getElementById(id);
    image.src = data.img;
    image.alt = data.alt;
  });

  // Update Titles
  document.getElementById('fb-title').textContent = data.title;
  document.getElementById('li-title').textContent = data.title;
  document.getElementById('tw-title').textContent = data.title;
  document.getElementById('wa-title').textContent = data.title;

  // Update Descriptions
  document.getElementById('fb-desc').textContent = data.desc;
  document.getElementById('tw-desc').textContent = data.desc;
  document.getElementById('wa-desc').textContent = data.desc.substring(0, 95) + '...';

  // Update Meta Table
  const rows = [
    ['og:site_name', 'property', 'Auckland Roof Professionals'],
    ['og:locale', 'property', 'en_NZ'],
    ['og:type', 'property', 'website'],
    ['og:title', 'property', data.title],
    ['og:description', 'property', data.desc],
    ['og:url', 'property', data.url],
    ['og:image', 'property', imageOrigin + data.img],
    ['og:image:secure_url', 'property', imageOrigin + data.img],
    ['og:image:type', 'property', 'image/jpeg'],
    ['og:image:width', 'property', '1200'],
    ['og:image:height', 'property', '630'],
    ['og:image:alt', 'property', data.alt],
    ['twitter:card', 'name', 'summary_large_image'],
    ['twitter:title', 'name', data.title],
    ['twitter:description', 'name', data.desc],
    ['twitter:image', 'name', imageOrigin + data.img],
    ['twitter:image:alt', 'name', data.alt],
  ];

  const tbody = document.getElementById('meta-rows');
  tbody.innerHTML = rows.map(([prop, attr, val]) => `
    <tr>
      <td><code>${attr === 'property' ? 'og:*' : 'twitter:*'}</code></td>
      <td><strong>${prop}</strong></td>
      <td>${val}</td>
    </tr>
  `).join('');
}

document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', () => switchPage(button.dataset.page));
});
switchPage('home');
