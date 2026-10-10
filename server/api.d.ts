import type { IncomingMessage, ServerResponse } from 'node:http'

export function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean>

export function resetRateLimits(): void
export const RATE_LIMIT_MAX_REQUESTS: number
export const RATE_LIMIT_WINDOW_MS: number
