const assert = require('node:assert/strict')
const fs = require('fs')
const Module = require('module')
const path = require('path')
const { describe, test } = require('node:test')
const { registerHooks } = require('node:module')

// OpenNext ships extensionless ESM imports. Node can load the cache adapter
// once those specifiers resolve to their .js files.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !path.extname(specifier)) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})
const React = require('react')
const { renderToString } = require('react-dom/server')
const { transformSync } = require('next/dist/build/swc')

const root = path.resolve(__dirname, '..')
const REAL_ID = '3f5e1787-b650-81ee-a210-c39d3901fbb5'

function Link({ children, href, ...rest }) {
  return React.createElement('a', { href, ...rest }, children)
}
function Image(props) {
  return React.createElement('img', { src: props.src, alt: props.alt || '' })
}

const calls = []
let publicPageImpl = async () => {
  const error = new Error('forbidden')
  error.status = 403
  error.code = 'restricted_resource'
  throw error
}

const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (typeof request === 'string' && request.endsWith('.css')) return {}
  if (request === 'next/link') return Link
  if (request === 'next/image') return Image
  if (typeof request === 'string' && request.includes('lib/notion')) {
    return {
      getPublicPageData(...args) {
        calls.push(args)
        return publicPageImpl(...args)
      },
    }
  }
  return origLoad.call(this, request, parent, isMain)
}

const origJs = Module._extensions['.js']
Module._extensions['.js'] = function (mod, filename) {
  if (!filename.startsWith(root) || filename.includes(`${path.sep}node_modules${path.sep}`)) {
    return origJs(mod, filename)
  }
  const src = fs.readFileSync(filename, 'utf8')
  if (!/(^|\n)\s*(import|export)\s/.test(src)) return origJs(mod, filename)
  const { code } = transformSync(src, {
    filename,
    // Next's page transform drops getStaticProps unless the server compiler keeps it.
    disableNextSsg: true,
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'automatic' } },
      target: 'es2022',
    },
    module: { type: 'commonjs' },
  })
  mod._compile(code, filename)
}

const { getStaticProps, default: BlogDetail } = require('../pages/blog/[id].js')

function notionError(status, code, message = 'notion failed') {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function resetNotion(impl) {
  calls.length = 0
  publicPageImpl = impl
}

function assertMissing(result) {
  assert.equal(result.notFound, true)
  assert.equal(result.props, undefined)
  assert.equal(result.revalidate, undefined)
}

async function openNextCache() {
  globalThis.openNextConfig = { dangerous: { disableTagCache: true } }
  globalThis.__openNextAls = { getStore() { return undefined } }
  const store = new Map()
  const puts = []
  const deletes = []
  globalThis.incrementalCache = {
    async get(key) {
      return store.has(key) ? { value: store.get(key), lastModified: Date.now() } : null
    },
    async set(key, value) {
      puts.push({ key, value })
      store.set(key, value)
    },
    async delete(key) {
      deletes.push(key)
      store.delete(key)
    },
  }
  const { default: Cache } = await import('@opennextjs/aws/adapters/cache.js')
  return { cache: new Cache(), store, puts, deletes }
}

// Next persists getStaticProps by writing the page when props exist, and by
// passing a null cache value when the result is notFound. OpenNext turns that
// null into an incremental-cache delete, which is what keeps R2 empty.
async function persistStaticProps(cache, key, result) {
  if (result.notFound) {
    await cache.set(key, null, {
      cacheControl: { revalidate: result.revalidate === undefined ? false : result.revalidate },
    })
    return
  }
  await cache.set(
    key,
    {
      kind: 'PAGES',
      html: '<article>cached</article>',
      pageData: result.props,
      status: 200,
      headers: {},
    },
    { cacheControl: { revalidate: result.revalidate } },
  )
}

describe('blog slug status', { concurrency: false }, () => {
test('unknown slug returns 404 without calling Notion', async () => {
  resetNotion(async () => {
    throw new Error('Notion should not be called')
  })
  const result = await getStaticProps({ params: { id: 'this-slug-does-not-exist-xyz' } })
  assertMissing(result)
  assert.equal(calls.length, 0)
})

test('scanner slug .env returns 404 without calling Notion', async () => {
  resetNotion(async () => {
    throw notionError(403, 'restricted_resource')
  })
  const result = await getStaticProps({ params: { id: '.env' } })
  assertMissing(result)
  assert.equal(calls.length, 0)
})

test('Notion 403 warns with the page id before returning 404', async () => {
  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => {
    warnings.push(args.map(part => (typeof part === 'string' ? part : JSON.stringify(part))).join(' '))
  }
  try {
    resetNotion(async () => {
      const error = notionError(403, 'restricted_resource')
      error.token = 'secret-token'
      error.headers = { authorization: 'Bearer secret-token' }
      throw error
    })
    const result = await getStaticProps({ params: { id: REAL_ID } })
    assertMissing(result)
    assert.equal(warnings.length, 1)
    const line = warnings[0]
    assert.match(line, /\[blog\] notion 403 treated as not found/)
    assert.match(line, new RegExp(REAL_ID))
    assert.match(line, /403/)
    assert.match(line, /restricted_resource/)
    assert.equal(line.includes('secret-token'), false)
    assert.equal(line.includes('authorization'), false)
    assert.equal(line.includes('Bearer'), false)
  } finally {
    console.warn = originalWarn
  }
})

test('Notion 404, 403, and object_not_found return 404', async () => {
  const cases = [
    notionError(404, 'object_not_found'),
    notionError(403, 'restricted_resource'),
    notionError(400, 'validation_error', 'page_id should be a valid uuid'),
    Object.assign(new Error('missing'), { code: 'object_not_found' }),
  ]
  for (const error of cases) {
    resetNotion(async () => {
      throw error
    })
    const result = await getStaticProps({ params: { id: REAL_ID } })
    assertMissing(result)
    assert.equal(calls.length, 1)
  }
})

test('private or foreign page returns 404', async () => {
  resetNotion(async () => null)
  const result = await getStaticProps({ params: { id: REAL_ID } })
  assertMissing(result)
})

test('unknown slug is not stored as a successful incremental cache entry', async () => {
  resetNotion(async () => {
    throw notionError(403, 'restricted_resource')
  })
  const slug = 'this-slug-does-not-exist-xyz'
  const result = await getStaticProps({ params: { id: slug } })
  const { cache, store, puts } = await openNextCache()
  const key = `/blog/${slug}`
  await persistStaticProps(cache, key, result)
  await persistStaticProps(cache, key, result)
  assert.equal(puts.length, 0)
  assert.equal(store.has(key), false)
})

test('Notion outage is not turned into a cached 404', async () => {
  const failures = [
    notionError(503, 'service_unavailable'),
    notionError(429, 'rate_limited'),
    notionError(401, 'unauthorized'),
    Object.assign(new Error('socket hang up'), { code: 'notionhq_client_request_timeout' }),
    new TypeError('fetch failed'),
  ]
  const { cache, store, puts } = await openNextCache()
  for (const error of failures) {
    resetNotion(async () => {
      throw error
    })
    await assert.rejects(() => getStaticProps({ params: { id: REAL_ID } }))
    assert.equal(puts.length, 0)
    assert.equal(store.size, 0)
  }
})

test('a real article renders and stays on the one-hour ISR cache', async () => {
  const page = {
    id: REAL_ID,
    created_time: '2026-01-02T00:00:00.000Z',
    cover: null,
    properties: {
      标题: { title: [{ plain_text: '突触里的一封信' }] },
      Description: { rich_text: [] },
      Tag: { multi_select: [] },
    },
  }
  const blocks = []
  resetNotion(async () => ({ page, blocks }))
  const result = await getStaticProps({ params: { id: REAL_ID } })
  assert.equal(result.notFound, undefined)
  assert.equal(result.revalidate, 3600)
  assert.equal(result.props.error, null)
  assert.equal(result.props.page, page)
  assert.deepEqual(result.props.blocks, blocks)

  const html = renderToString(React.createElement(BlogDetail, result.props))
  assert.match(html, /突触里的一封信/)

  const { cache, store, puts } = await openNextCache()
  const key = `/blog/${REAL_ID}`
  await persistStaticProps(cache, key, result)
  const cached = store.get(key)
  assert.equal(puts.length, 1)
  assert.equal(cached.revalidate, 3600)
  assert.equal(cached.type, 'page')
  const second = await globalThis.incrementalCache.get(key)
  assert.equal(second.value.revalidate, 3600)
  assert.equal(second.value.html.includes('cached'), true)
})
})
