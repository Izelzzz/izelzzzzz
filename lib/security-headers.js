/**
 * Baseline security headers for every response on izelzzz.com.
 *
 * OpenNext on Cloudflare leaves `assets.run_worker_first` unset, so Workers
 * serves static assets before the Worker. Those responses read `public/_headers`.
 * `cloudflare/worker.js` applies this list to every Worker response, including
 * `/_next/image`, which OpenNext handles before the Next server.
 * `next.config.js` `headers()` publishes the same list for the Next server
 * (`next dev`, `next start`, and Next-handled routes on Cloudflare).
 *
 * After editing SECURITY_HEADERS or the static cache rule, run
 * `node scripts/sync-public-headers.js` and `npm test`.
 */

const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy() },
]

/**
 * Report-only policy for resources this app actually loads.
 *
 * script-src includes 'unsafe-inline' because the Pages Router / Turbopack
 * production HTML contains an inline `globalThis.TURBOPACK.push(...)` bootstrap
 * whose chunk hashes change every build.
 *
 * style-src includes 'unsafe-inline' because article pages render Notion text
 * colors as element style attributes. Stylesheets themselves are same-origin.
 *
 * img-src lists the image hosts the renderer and cover helpers already use:
 * same-origin files, SVG data URIs, Next image blob URLs, Unsplash, imgix,
 * Notion page covers (notion.so / notion.com), Notion static files, and
 * signed Notion uploads on prod-files-secure.s3.us-west-2.amazonaws.com.
 * Other Notion external image hosts stay outside the list so report-only
 * mode records them.
 *
 * The repo has no analytics beacons, tag managers, or web-font requests.
 * Embeds and bookmarks render as links, so frame-src is 'none'.
 * The homepage video is served from /videos on this origin.
 */
function contentSecurityPolicy() {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "frame-src 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "media-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    [
      "img-src 'self' data: blob:",
      'https://*.unsplash.com',
      'https://*.imgix.net',
      'https://imgix.net',
      'https://*.imgix.com',
      'https://imgix.com',
      'https://*.notion.so',
      'https://notion.so',
      'https://*.notion.com',
      'https://*.notion-static.com',
      'https://prod-files-secure.s3.us-west-2.amazonaws.com',
    ].join(' '),
  ]

  return directives.join('; ')
}

const STATIC_ASSET_CACHE_RULE = {
  path: '/_next/static/*',
  headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
}

function renderHeaderBlock(path, headers) {
  return [path, ...headers.map(header => `  ${header.key}: ${header.value}`)].join('\n')
}

function renderPublicHeadersFile() {
  const comments = [
    '# Workers static assets. Same security headers as lib/security-headers.js.',
    '# Regenerate with: node scripts/sync-public-headers.js',
  ].join('\n')
  const body = [
    comments,
    renderHeaderBlock('/*', SECURITY_HEADERS),
    renderHeaderBlock(STATIC_ASSET_CACHE_RULE.path, STATIC_ASSET_CACHE_RULE.headers),
  ].join('\n\n')

  return `${body}\n`
}

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

module.exports = {
  SECURITY_HEADERS,
  STATIC_ASSET_CACHE_RULE,
  contentSecurityPolicy,
  renderPublicHeadersFile,
  withSecurityHeaders,
}
