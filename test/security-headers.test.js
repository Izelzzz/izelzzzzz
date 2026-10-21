const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { describe, it } = require('node:test')
const nextConfig = require('../next.config')
const {
  SECURITY_HEADERS,
  contentSecurityPolicy,
  renderPublicHeadersFile,
} = require('../lib/security-headers')

const HEADERS_PATH = path.join(__dirname, '..', 'public', '_headers')

function headerMap(headers) {
  return new Map(headers.map(header => [header.key, header.value]))
}

describe('security response headers', () => {
  it('publishes the required baseline on every Next route', async () => {
    const rules = await nextConfig.headers()
    assert.deepEqual(rules.map(rule => rule.source), ['/(.*)'])
    assert.deepEqual(rules[0].headers, SECURITY_HEADERS)
  })

  it('keeps public/_headers identical to the shared list plus the static cache rule', () => {
    const onDisk = fs.readFileSync(HEADERS_PATH, 'utf8')
    assert.equal(onDisk, renderPublicHeadersFile())
  })

  it('sets each required header once, with the CSP in report-only mode', () => {
    const headers = headerMap(SECURITY_HEADERS)
    assert.deepEqual([...headers.keys()], [
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Content-Security-Policy-Report-Only',
    ])
    assert.equal(headers.get('Strict-Transport-Security'), 'max-age=31536000')
    assert.equal(headers.get('X-Content-Type-Options'), 'nosniff')
    assert.equal(headers.get('X-Frame-Options'), 'SAMEORIGIN')
    assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin')
    assert.equal(headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=()')
    assert.equal(headers.has('Content-Security-Policy'), false)
    assert.equal(headers.get('Content-Security-Policy-Report-Only'), contentSecurityPolicy())
  })

  it('keeps the CSP within the Workers _headers line limit and allows known site resources', () => {
    const policy = contentSecurityPolicy()
    const line = `  Content-Security-Policy-Report-Only: ${policy}`
    assert.ok(line.length < 2000, `CSP line is ${line.length} characters`)

    for (const directive of [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "media-src 'self'",
      "connect-src 'self'",
      "frame-src 'none'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      'https://*.unsplash.com',
      'https://*.imgix.net',
      'https://*.notion.so',
      'https://*.notion.com',
      'https://*.notion-static.com',
      'https://*.amazonaws.com',
      'data:',
    ]) {
      assert.ok(policy.includes(directive), directive)
    }

    assert.equal(policy.includes('google-analytics'), false)
    assert.equal(policy.includes('fonts.googleapis'), false)
    assert.equal(policy.includes('cloudflareinsights'), false)
  })

  it('preserves immutable caching for hashed Next static files', () => {
    const cacheBlock = renderPublicHeadersFile()
      .trimEnd()
      .split('\n\n')
      .find(block => block.startsWith('/_next/static/*'))
    assert.equal(
      cacheBlock,
      '/_next/static/*\n  Cache-Control: public, max-age=31536000, immutable',
    )
  })
})
