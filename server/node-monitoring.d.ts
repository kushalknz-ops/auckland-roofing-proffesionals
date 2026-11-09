import type { IncomingMessage, ServerResponse } from 'node:http'

export function observeNodeRequest(
  handler: (request: IncomingMessage, response: ServerResponse) => unknown,
  local?: boolean,
): (request: IncomingMessage, response: ServerResponse) => Promise<void>

export function receiveNodeTelemetry(
  request: IncomingMessage, response: ServerResponse, origin: string, local?: boolean,
): Promise<void>
