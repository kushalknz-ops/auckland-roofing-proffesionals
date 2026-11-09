import { isIP } from 'node:net'
import { CANONICAL_HOST as DEFAULT_CANONICAL_HOST } from '../src/lib/site-url.ts'

export function readOrigin(value, name) {
  try {
    const url = new URL(value)
    if (!/^https?:\/\/[^/?#\\\s*@%]+\/?$/i.test(value) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) throw new Error()
    return url.origin
  } catch {
    throw new Error(`${name} must contain an HTTP(S) origin without credentials, a path, query or fragment.`)
  }
}

export function readPort(name, value, fallback) {
  if (!value) return fallback
  const port = Number(value)
  if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a port between 1 and 65535.`)
  }
  return port
}

export const CANONICAL_HOST = process.env.CANONICAL_HOST || DEFAULT_CANONICAL_HOST
if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(CANONICAL_HOST) ||
    CANONICAL_HOST !== CANONICAL_HOST.toLowerCase()) {
  throw new Error('CANONICAL_HOST must be a lowercase hostname without a scheme or port.')
}

export function readAllowedOrigins(value, development) {
  const name = development ? 'DEV_ALLOWED_ORIGINS' : 'ALLOWED_ORIGINS'
  const origins = value?.trim() ? value.split(',').map((item) => readOrigin(item.trim(), name)) : []
  if (!development && origins.some((origin) => !origin.startsWith('https://'))) {
    throw new Error('ALLOWED_ORIGINS requires HTTPS in production.')
  }
  return new Set(origins)
}

function normalizeIp(value) {
  return value?.replace(/^::ffff:(?=\d+\.)/i, '')
}

const trustedProxyIps = new Set((process.env.TRUSTED_PROXY_IPS || '').split(',')
  .map((value) => normalizeIp(value.trim())).filter(Boolean))
if ([...trustedProxyIps].some((value) => !isIP(value))) {
  throw new Error('TRUSTED_PROXY_IPS must contain only IP addresses.')
}

export function isTrustedProxy(req) {
  return trustedProxyIps.has(normalizeIp(req.socket?.remoteAddress))
}

export function getClientIp(req) {
  const peer = normalizeIp(req.socket?.remoteAddress) || 'unknown'
  if (!isTrustedProxy(req)) return peer
  // The immediate trusted proxy must overwrite or append its observed client address.
  const forwarded = normalizeIp(req.headers['x-forwarded-for']?.split(',').at(-1)?.trim())
  return forwarded && isIP(forwarded) ? forwarded : peer
}

export function isSecureRequest(req) {
  return Boolean(req.socket?.encrypted || (isTrustedProxy(req) && req.headers['x-forwarded-proto'] === 'https'))
}
