export const CSP_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self' https://fonts.googleapis.com",
  "style-src-attr 'none'",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "media-src https://res.cloudinary.com/avvuses1/video/upload/",
  "connect-src 'self'",
  "frame-src https://www.google.com/maps",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')

export const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=(), xr-spatial-tracking=()'
export const HSTS_POLICY = 'max-age=31536000'

export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': CSP_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': PERMISSIONS_POLICY,
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-XSS-Protection': '0',
})

export function unavailableApiResponse(request) {
  const headers = new Headers({ ...SECURITY_HEADERS, 'Cache-Control': 'no-store' })
  if (new URL(request.url).protocol === 'https:') {
    headers.set('Strict-Transport-Security', HSTS_POLICY)
  }
  return Response.json(
    { success: false, message: 'Online submissions are unavailable. Please call us on 0800 766 311.' },
    { status: 503, headers },
  )
}
