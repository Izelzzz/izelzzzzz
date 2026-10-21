import nextWorker, {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from '../.open-next/worker.js'
import { SECURITY_HEADERS } from '../lib/security-headers.js'

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache }

/**
 * OpenNext answers `/_next/image` before the Next server, so `headers()` in
 * next.config.js never sees that response. Static assets still skip the Worker
 * (`assets.run_worker_first` is unset) and receive the same list from
 * public/_headers. This wrapper covers every response the Worker itself returns.
 */
function withSecurityHeaders(response) {
  const headers = new Headers(response.headers)
  for (const header of SECURITY_HEADERS) {
    headers.set(header.key, header.value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

const worker = {
  async fetch(request, env, ctx) {
    const response = await nextWorker.fetch(request, env, ctx)
    return withSecurityHeaders(response)
  },
}

export default worker
