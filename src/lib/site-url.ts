export const CANONICAL_HOST = 'aucklandroofprofessionals.nz'
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`

export function normalizePagePath(pathname: string) {
  const clean = pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '').toLowerCase() || '/'
  if (clean === '/index.html') return '/'
  if (clean === '/404.html' || clean === '/social-preview.html') return pathname
  return /^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.html$/.test(clean) ? clean.slice(0, -5) : clean
}
