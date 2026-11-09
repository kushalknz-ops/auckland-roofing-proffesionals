import type { IncomingMessage } from 'node:http'

export function readAllowedOrigins(value: string | undefined, development: boolean): ReadonlySet<string>
export function isSecureRequest(req: IncomingMessage): boolean
