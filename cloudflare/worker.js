import nextWorker, {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from '../.open-next/worker.js'
import { withSecurityHeaders } from '../lib/security-headers.js'

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache }

/**
 * OpenNext answers `/_next/image` before the Next server, so `headers()` in
 * next.config.js never sees that response. Static assets still skip the Worker
 * (`assets.run_worker_first` is unset) and receive the same list from
 * public/_headers. This wrapper covers every response the Worker itself returns.
 */

const worker = {
  async fetch(request, env, ctx) {
    const response = await nextWorker.fetch(request, env, ctx)
    return withSecurityHeaders(response)
  },
}

export default worker
