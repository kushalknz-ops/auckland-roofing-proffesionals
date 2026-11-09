import { handlePageAlias } from '../server/service-pages.js'

export async function onRequest({ request, env, next }) {
  return await handlePageAlias(request, env.ASSETS) ?? next()
}
