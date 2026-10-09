import { defineCloudflareConfig } from '@opennextjs/cloudflare/config'
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache'
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache'
import doQueue from '@opennextjs/cloudflare/overrides/queue/do-queue'

/**
 * OpenNext Cloudflare caching for ISR (time-based revalidate).
 * Requires wrangler bindings: NEXT_INC_CACHE_R2_BUCKET, WORKER_SELF_REFERENCE, NEXT_CACHE_DO_QUEUE.
 * See docs/performance-architecture.md §9.
 */
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
  queue: doQueue,
})
